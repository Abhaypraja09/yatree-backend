import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import {
    Users, Plus, Search, Clock, MapPin, User, MoreVertical, IndianRupee, Calendar, Download, X,
    ChevronLeft, ChevronRight, UserPlus, Eye, Trash2, Filter, ArrowUpRight, ArrowDownLeft,
    ShieldCheck, Lock, Unlock, Settings, LayoutDashboard, AlertCircle, CheckCircle, Info,
    Camera, Printer, FileText, Phone, Edit2, Edit3, TrendingUp, TrendingDown, History, CheckCircle2, XCircle, Target,
    CalendarX, Plane, Mail, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import OfficeGeofencePicker from '../components/OfficeGeofencePicker';
import { todayIST, toISTDateString, formatDateIST, formatTimeIST, nowIST } from '../utils/istUtils';
import PremiumDateInput from '../components/common/PremiumDateInput';
import { DateTime } from 'luxon';

const Staff = () => {
    const { theme } = useTheme();
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            :root {
                --primary: #fbbf24;
                --primary-glow: rgba(251, 191, 36, 0.3);
                --bg-obsidian: #020617;
                --glass-bg: rgba(255, 255, 255, 0.03);
                --glass-border: rgba(255, 255, 255, 0.08);
            }
            .premium-panel {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 32px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }
            .stat-card-inner {
                padding: 24px;
                border-radius: 28px;
                background: rgba(255, 255, 255, 0.02);
                border: 1px solid rgba(255, 255, 255, 0.05);
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                cursor: pointer;
            }
            .stat-card-inner:hover {
                background: rgba(255, 255, 255, 0.04);
                transform: translateY(-5px);
                border-color: var(--primary);
            }
            .action-btn-premium {
                height: 52px;
                padding: 0 24px;
                border-radius: 16px;
                font-weight: 800;
                display: flex;
                align-items: center;
                gap: 10px;
                transition: all 0.3s ease;
                cursor: pointer;
                border: 1px solid rgba(255,255,255,0.1);
            }
            .tab-btn-premium {
                padding: 12px 24px;
                border-radius: 16px;
                font-size: 13px;
                font-weight: 700;
                display: flex;
                align-items: center;
                gap: 10px;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                cursor: pointer;
                border: none;
                white-space: nowrap;
            }
            .custom-table th {
                padding: 20px 25px;
                color: rgba(255,255,255,0.4);
                font-size: 11px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .custom-table td {
                padding: 16px 25px;
                vertical-align: middle;
            }
            .row-card {
                background: rgba(255,255,255,0.02);
                transition: all 0.3s ease;
            }
            .row-card:hover {
                background: rgba(255,255,255,0.05);
                transform: scale(1.002);
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    const { user } = useAuth();
    const { selectedCompany } = useCompany();

    const location = useLocation();
    const [staffList, setStaffList] = useState([]);
    const [attendanceList, setAttendanceList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [view, setView] = useState('attendance'); // 'list', 'attendance', 'leaves', 'summary', 'advances'
    const [searchTerm, setSearchTerm] = useState('');
    const [isRange, setIsRange] = useState(false);
    const [fromDate, setFromDate] = useState(todayIST());
    const [toDate, setToDate] = useState(todayIST());
    const [filterStaff, setFilterStaff] = useState('all');

    const [formData, setFormData] = useState({
        name: '', mobile: '', username: '', password: '', confirmPassword: '', oldPassword: '', salary: 0, monthlyLeaveAllowance: 4,
        email: '', designation: '', shiftTiming: { start: '09:00', end: '18:00' },
        officeLocation: { latitude: '', longitude: '', address: '', radius: 200 },
        joiningDate: '',
        staffType: 'Regular'
    });

    const [locationLoading, setLocationLoading] = useState(false);

    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [monthlyReport, setMonthlyReport] = useState([]);
    const [salaryPayments, setSalaryPayments] = useState([]);
    const [advances, setAdvances] = useState([]);
    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
    const [paymentModal, setPaymentModal] = useState({ show: false, report: null, amount: '', paymentId: null, isPaid: false });
    const [advanceFormData, setAdvanceFormData] = useState({
        staffId: '', amount: '', date: todayIST(), remark: '', givenBy: 'Office'
    });
    const [editingAdvance, setEditingAdvance] = useState(null);
    const [submittingAdvance, setSubmittingAdvance] = useState(false);
    const [isFetching, setIsFetching] = useState(false);

    useEffect(() => {
        if (selectedStaffReport && monthlyReport.length > 0) {
            const updated = monthlyReport.find(r => r.staffId === (selectedStaffReport.staffId || selectedStaffReport._id));
            if (updated) {
                setSelectedStaffReport(updated);
            }
        }
    }, [monthlyReport]);

    const [selectedMonth, setSelectedMonth] = useState(DateTime.now().setZone('Asia/Kolkata').month.toString());
    const [selectedYear, setSelectedYear] = useState(DateTime.now().setZone('Asia/Kolkata').year.toString());
    const [selectedDate, setSelectedDate] = useState(todayIST());
    const [selectedDay, setSelectedDay] = useState(DateTime.now().setZone('Asia/Kolkata').day.toString());
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [selectedStaffReport, setSelectedStaffReport] = useState(null);
    const [showBackdateModal, setShowBackdateModal] = useState(false);
    const [backdateForm, setBackdateForm] = useState({ staffId: '', date: '', status: 'present', punchInTime: '', punchOutTime: '' });
    const [monthlyTarget, setMonthlyTarget] = useState(26); // Default monthly attendance target
    const [isEditing, setIsEditing] = useState(false);
    const [editingStaffId, setEditingStaffId] = useState(null);
    const [staffStats, setStaffStats] = useState({ totalStaff: 0, todayAttendance: 0, pendingLeaves: 0 });

    const handleTargetChange = (val) => {
        const num = Number(val);
        setMonthlyTarget(num);
        if (selectedCompany?._id) localStorage.setItem(`staffTarget_${selectedCompany._id}`, num.toString());
    };

    useEffect(() => {
        if (selectedCompany?._id) {
            const savedTarget = localStorage.getItem(`staffTarget_${selectedCompany._id}`);
            if (savedTarget) setMonthlyTarget(Number(savedTarget));
        }
    }, [selectedCompany]);

    useEffect(() => {
        if (view === 'attendance') {
            const now = DateTime.now().setZone('Asia/Kolkata');
            setSelectedDay(now.day.toString());
            setSelectedMonth(now.month.toString());
            setSelectedYear(now.year.toString());
            setSelectedDate(todayIST());
        } else {
            setSelectedDay('all');
        }
        if (view === 'summary' || view === 'advances' || view === 'list') {
            setIsRange(false);
        }
    }, [view]);

    const MIN_BACKDATE_LIMIT = (() => {
        const d = nowIST();
        d.setUTCDate(d.getUTCDate() - 60);
        return toISTDateString(d);
    })();

    useEffect(() => {
        if (!selectedCompany) return;

        // Fetch lightweight stats for the top cards
        fetchStaffStats();

        // Context-aware fetching: only fetch what is needed for the current view
        if (view === 'list') {
            fetchStaff();
        } else if (view === 'attendance') {
            fetchAttendance();
        } else if (view === 'leaves') {
            fetchAllLeaves();
        } else if (view === 'summary' || view === 'advances') {
            fetchMonthlyReport();
        }

        // Always ensure staff list is present as it's often needed for IDs/Names
        if (staffList.length === 0 && view !== 'list') {
            fetchStaff();
        }
    }, [selectedCompany?._id, view, fromDate, toDate, selectedMonth, selectedYear, selectedDay, isRange]);

    const fetchAllLeaves = async () => {
        if (!selectedCompany?._id) return;
        try {
            const { data } = await axios.get(`/api/admin/leaves/all/${selectedCompany._id}`);
            setPendingLeaves(data); // Reusing the same state but it will now contain all
        } catch (error) {
            console.error('Error fetching leaves:', error);
        }
    };

    const fetchMonthlyReport = async () => {
        if (!selectedCompany?._id) return;
        console.log(`[fetchMonthlyReport] month=${selectedMonth}, year=${selectedYear}, view=${view}`);
        setIsFetching(true);
        try {
            let url = `/api/admin/staff-attendance/${selectedCompany._id}`;
            let paymentUrl = `/api/admin/salary-payments/${selectedCompany._id}`;

            if (isRange) {
                url += `?from=${fromDate}&to=${toDate}&includeAttendance=false`;
                paymentUrl += `?month=${selectedMonth}&year=${selectedYear}`;
            } else {
                url += `?month=${selectedMonth}&year=${selectedYear}&includeAttendance=false`;
                paymentUrl += `?month=${selectedMonth}&year=${selectedYear}`;
            }

            const [attendanceRes, paymentRes, advancesRes] = await Promise.all([
                axios.get(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`),
                axios.get(`${paymentUrl}${paymentUrl.includes('?') ? '&' : '?'}t=${Date.now()}`).catch(() => ({ data: [] })),
                axios.get(`/api/admin/advances/${selectedCompany._id}?month=${selectedMonth}&year=${selectedYear}&isStaffAdvance=true&t=${Date.now()}`).catch(() => ({ data: [] }))
            ]);

            setMonthlyReport(attendanceRes.data.report || []);
            setSalaryPayments(paymentRes.data || []);
            setAdvances(advancesRes.data || []);
        } catch (error) {
            console.error('Error fetching monthly report:', error);
        } finally {
            setIsFetching(false);
        }
    };

    const handleOpenPaymentModal = (report, payment, isPaid) => {
        setPaymentModal({
            show: true,
            report: report,
            amount: isPaid ? (payment.amount || 0) : (report.finalSalary || 0),
            paymentId: payment?._id || null,
            isPaid: isPaid
        });
    };

    const handleSavePayment = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/admin/salary-payment', {
                staffId: paymentModal.report.staffId,
                companyId: selectedCompany._id,
                month: parseInt(selectedMonth),
                year: parseInt(selectedYear),
                amount: paymentModal.amount,
                method: 'Bank Transfer'
            });
            setPaymentModal({ show: false, report: null, amount: '', paymentId: null, isPaid: false });
            fetchMonthlyReport();
        } catch (err) {
            console.error('Payment error:', err);
            alert('Failed to update payment status');
        }
    };

    const handleMarkAsDue = async () => {
        if (!paymentModal.paymentId) return;
        if (!window.confirm('Are you sure you want to delete this payment record and mark as DUE?')) return;
        
        try {
            await axios.delete(`/api/admin/salary-payment/${paymentModal.paymentId}`);
            setPaymentModal({ show: false, report: null, amount: '', paymentId: null, isPaid: false });
            fetchMonthlyReport();
        } catch (err) {
            console.error('Delete payment error:', err);
            alert('Failed to mark as due');
        }
    };

    const handleSaveAdvance = async (e) => {
        e.preventDefault();
        setSubmittingAdvance(true);
        try {
            if (editingAdvance) {
                await axios.put(`/api/admin/advances/${editingAdvance._id}`, {
                    ...advanceFormData,
                    month: parseInt(selectedMonth),
                    year: parseInt(selectedYear)
                });
            } else {
                await axios.post('/api/admin/advances', {
                    ...advanceFormData,
                    companyId: selectedCompany._id,
                    isStaffAdvance: true,
                    month: parseInt(selectedMonth),
                    year: parseInt(selectedYear)
                });
            }
            setShowAdvanceModal(false);
            setEditingAdvance(null);
            setAdvanceFormData({ staffId: '', amount: '', date: todayIST(), remark: '', givenBy: 'Office' });
            fetchMonthlyReport();
        } catch (err) {
            console.error('Advance error:', err);
            alert('Failed to save advance');
        } finally {
            setSubmittingAdvance(false);
        }
    };

    const handleDeleteAdvance = async (id) => {
        if (!window.confirm('Are you sure you want to delete this advance record?')) return;
        try {
            await axios.delete(`/api/admin/advances/${id}`);
            fetchMonthlyReport();
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete advance');
        }
    };

    const handleEditAdvance = (adv) => {
        setEditingAdvance(adv);
        setAdvanceFormData({
            staffId: adv.staff?._id || adv.staff,
            amount: adv.amount,
            date: toISTDateString(adv.date),
            remark: adv.remark || '',
            givenBy: adv.givenBy || 'Office'
        });
        setShowAdvanceModal(true);
    };

    const handleLeaveAction = async (id, status) => {
        try {
            await axios.patch(`/api/admin/leaves/${id}`, { status });
            fetchAllLeaves();
            fetchAttendance();
        } catch (error) {
            alert('Error updating leave status');
        }
    };

    const handleDeleteStaffAttendance = async (id) => {
        if (!window.confirm('Are you sure you want to delete this attendance record?')) return;
        try {
            await axios.delete(`/api/admin/staff-attendance/${id}`);
            fetchAttendance();
            alert('Attendance record deleted');
        } catch (error) {
            alert('Error deleting attendance record');
        }
    };

    // ── AI AGENT SEARCH INTEGRATION ──
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchParam = params.get('search') || params.get('name') || params.get('staff');
        if (searchParam) setSearchTerm(searchParam);
    }, [location.search]);

    useEffect(() => {
        const resetAll = () => {
            setSearchTerm('');
            setShowAddModal(false);
            setShowBackdateModal(false);
            setIsEditing(false);
            const now = nowIST();
            setFromDate(todayIST());
            setToDate(todayIST());
            setBackdateForm({ staffId: '', date: todayIST(), status: 'present', punchInTime: '', punchOutTime: '' });
            setFormData({
                name: '', mobile: '', username: '', password: '', oldPassword: '', salary: 0, monthlyLeaveAllowance: 4,
                email: '', designation: '', shiftTiming: { start: '09:00', end: '18:00' },
                officeLocation: { latitude: '', longitude: '', address: '', radius: 200 },
                joiningDate: todayIST(),
                staffType: 'Company'
            });
        };

        resetAll();
        return () => resetAll();
    }, [location.pathname, location.key]);

    const fetchStaff = async () => {
        if (!selectedCompany?._id) return;
        try {
            const { data } = await axios.get(`/api/admin/staff/${selectedCompany._id}`);
            setStaffList(data);
        } catch (error) {
            console.error('Error fetching staff:', error);
        }
    };

    const fetchStaffStats = async () => {
        if (!selectedCompany?._id) return;
        try {
            const { data } = await axios.get(`/api/admin/staff-stats/${selectedCompany._id}`);
            setStaffStats(data);
        } catch (error) {
            console.error('Error fetching staff stats:', error);
        }
    };

    const fetchAttendance = async () => {
        if (!selectedCompany?._id) return;
        try {
            setIsFetching(true);
            let params = `?t=${Date.now()}`;
            if (isRange) {
                params += `&from=${fromDate}&to=${toDate}`;
            } else if (selectedDay !== 'all') {
                const dayStr = String(selectedDay).padStart(2, '0');
                const targetDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${dayStr}`;
                params += `&date=${targetDate}`;
            } else if (selectedMonth && selectedYear) {
                params += `&month=${selectedMonth}&year=${selectedYear}`;
            } else {
                const today = todayIST();
                params += `&date=${today}`;
            }
            const { data } = await axios.get(`/api/admin/staff-attendance/${selectedCompany._id}${params}`);
            setAttendanceList(data.attendance || []);
            setIsFetching(false);
        } catch (error) {
            console.error('Error fetching staff attendance:', error);
            setIsFetching(false);
        }
    };


    const exportToExcel = () => {
        const dataToExport = filteredAttendance.map(record => ({
            'Date': record.date,
            'Staff Name': record.staff?.name || 'Unknown',
            'Mobile': record.staff?.mobile || 'N/A',
            'Punch In Time': record.punchIn?.time ? formatTimeIST(record.punchIn.time) : '—',
            'Punch In Location': record.punchIn?.location?.address || 'N/A',
            'Punch Out Time': record.punchOut?.time ? formatTimeIST(record.punchOut.time) : (record.status === 'absent' ? 'Leave' : 'On Duty'),
            'Punch Out Location': record.punchOut?.location?.address || 'N/A',
            'Status': record.status || 'Present'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Staff Attendance");
        XLSX.writeFile(wb, `Staff_Attendance_${isRange ? `${fromDate}_to_${toDate}` : toDate}.xlsx`);
    };

    const exportPayrollToExcel = () => {
        if (!monthlyReport || monthlyReport.length === 0) {
            alert('No payroll data available to export.');
            return;
        }

        const dataToExport = monthlyReport.map(item => ({
            'Staff Name': item.name,
            'Designation': item.designation || 'Staff',
            'Cycle Start': item.cycleStart,
            'Cycle End': item.cycleEnd,
            'Basic Salary': item.baseSalary || item.salary,
            'Days in Cycle': item.totalDaysInCycle,
            'Present Days': item.presentDays,
            'Approved Leaves': item.approvedLeaveDays,
            'Paid Sundays': item.paidSundays,
            'Unpaid Sundays': item.unpaidSundays,
            'Unapproved Absences': item.unapprovedAbsences,
            'Total Earned Days': item.earnedDays,
            'Net Payable': item.finalSalary
        })); 

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Payroll Summary");
        XLSX.writeFile(wb, `Staff_Payroll_${selectedMonth}_${selectedYear}.xlsx`);
    };

    const loadImage = (url) => {
        return new Promise((resolve, reject) => {
            if (!url) return resolve(null);
            let finalUrl = url;
            if (!url.startsWith('http') && !url.startsWith('/')) {
                finalUrl = `https://superadmin.yatreedestination.com/uploads/${url}`;
            }
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            if (finalUrl.startsWith('http')) {
                img.src = `/api/admin/proxy-image?url=${encodeURIComponent(finalUrl)}`;
            } else {
                img.src = finalUrl;
            }
        });
    };

    const generateSalarySlipPage = async (doc, staff, isFirstPage = true) => {
        const logoUrl = selectedCompany?.logoUrl || '/logos/logo.png';
        const logo = await loadImage(logoUrl).catch(() => null);

        const sigUrl = selectedCompany?.ownerSignatureUrl || '/logos/signature.png';
        const signature = await loadImage(sigUrl).catch(() => null);

        if (!isFirstPage) doc.addPage();

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const monthName = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1).toLocaleString('default', { month: 'long' });
        const periodLabel = isRange
            ? `${formatDateIST(fromDate).toUpperCase()} - ${formatDateIST(toDate).toUpperCase()}`
            : `${monthName} ${selectedYear}`.toUpperCase();

        // 1. HEADER
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 50, 'F');

        // Premium Logo Container
        if (logo) {
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(12, 8, 34, 34, 3, 3, 'F'); // White background for logo
            doc.addImage(logo, 'PNG', 14, 10, 30, 30);
        } else {
            // Placeholder if logo fails
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.5);
            doc.roundedRect(12, 8, 34, 34, 3, 3, 'D');
            doc.setFontSize(8);
            doc.setTextColor(255, 255, 255);
            doc.text('LOGO', 24, 26, { align: 'center' });
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text((selectedCompany?.name || 'FLEET MANAGEMENT').toUpperCase(), 52, 22);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(200, 200, 200);
        doc.text('Commercial Fleet Operations & Management', 52, 30);
        doc.setTextColor(14, 165, 233);
        doc.text(selectedCompany?.website || '', 52, 37);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('STAFF SALARY SLIP', pageWidth - 15, 22, { align: 'right' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text(`STATEMENT PERIOD`, pageWidth - 15, 30, { align: 'right' });
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.text(periodLabel.toUpperCase(), pageWidth - 15, 36, { align: 'right' });

        // 2. INFORMATION SECTION
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('EMPLOYEE INFORMATION', 15, 65);
        doc.setDrawColor(14, 165, 233);
        doc.setLineWidth(0.5);
        doc.line(15, 68, 50, 68);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text('NAME', 15, 76);
        doc.text('DESIGNATION', 15, 84);
        doc.text(isRange ? 'REPORT PERIOD' : 'SALARY CYCLE', 15, 92);

        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text((staff.name || 'N/A').toUpperCase(), 45, 76);
        doc.text((staff.designation || 'STAFF').toUpperCase(), 45, 84);
        const displayCycle = isRange
            ? `${formatDateIST(fromDate)} - ${formatDateIST(toDate)}`
            : `${formatDateIST(staff.cycleStart)} - ${formatDateIST(staff.cycleEnd)}`;
        doc.text(displayCycle, 45, 92);

        // Summary Box
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(pageWidth / 2, 60, pageWidth / 2 - 15, 45, 3, 3, 'F');
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('PAYMENT OVERVIEW', pageWidth / 2 + 5, 68);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Base Salary:', pageWidth / 2 + 5, 74);
        doc.text('Sunday Bonus:', pageWidth / 2 + 5, 78);
        doc.text('Deductions:', pageWidth / 2 + 5, 82);

        doc.setTextColor(15, 23, 42);
        doc.text(`Rs. ${(staff.salary || 0).toLocaleString('en-IN')}`, pageWidth - 20, 74, { align: 'right' });
        doc.setTextColor(16, 185, 129);
        doc.text(`+ Rs. ${(staff.sundayBonus || 0).toLocaleString('en-IN')}`, pageWidth - 20, 78, { align: 'right' });
        doc.setTextColor(244, 63, 94);
        doc.text(`- Rs. ${(staff.deduction || 0).toLocaleString('en-IN')}`, pageWidth - 20, 82, { align: 'right' });

        doc.setDrawColor(203, 213, 225);
        doc.line(pageWidth / 2 + 5, 86, pageWidth - 20, 86);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text('NET PAYABLE:', pageWidth / 2 + 5, 96);
        doc.text(`Rs. ${(staff.finalSalary || 0).toLocaleString('en-IN')}`, pageWidth - 20, 96, { align: 'right' });

        // 3. ATTENDANCE TABLE
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('ATTENDANCE & DUTY LOGS', 15, 115);

        const attendanceRows = (staff.attendanceData || []).map(log => [
            formatDateIST(log.date),
            formatDateIST(log.date, { weekday: 'long' }),
            (log.status || 'ABSENT').toUpperCase(),
            log.punchIn?.time ? formatTimeIST(log.punchIn.time) : '--',
            log.punchOut?.time ? formatTimeIST(log.punchOut.time) : '--'
        ]);

        autoTable(doc, {
            head: [['DATE', 'DAY', 'STATUS', 'PUNCH IN', 'PUNCH OUT']],
            body: attendanceRows,
            startY: 120,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], fontSize: 8, halign: 'center' },
            bodyStyles: { fontSize: 8, halign: 'center', textColor: [51, 65, 85] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 15, right: 15 }
        });

        // 4. EARNINGS SUMMARY
        let currentY = doc.lastAutoTable.finalY + 15;
        if (currentY > pageHeight - 80) { doc.addPage(); currentY = 20; }

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('EARNINGS & LEAVES SUMMARY', 15, currentY);

        const summaryRows = [
            ['Total Days in Period', `${staff.totalDaysInCycle || 30} Days`],
            ['Actual Days Present', `${staff.presentDays || 0} Days`],
            ['Sundays (Paid Holidays)', `${staff.sundaysPassed || 0} Days`],
            ['Sundays Worked (Extra Bonus)', `${staff.sundaysWorked || 0} Days`],
            ['Total Absences', `${staff.leavesTaken || 0} Days`],
            ['Unpaid Days (Deducted)', `${staff.extraLeaves || 0} Days`],
            ['Net Salary Deduction', `Rs. ${(staff.deduction || 0).toLocaleString('en-IN')}`]
        ];

        autoTable(doc, {
            body: summaryRows,
            startY: currentY + 5,
            theme: 'striped',
            bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
            columnStyles: {
                1: { halign: 'right', fontStyle: 'bold' }
            },
            didParseCell: (data) => {
                if (data.row.index === 5 || data.row.index === 6) {
                    data.cell.styles.textColor = [220, 38, 38]; // Red for deductions
                }
            },
            margin: { left: 15, right: 15 }
        });

        // 5. SIGNATURE & FOOTER
        currentY = doc.lastAutoTable.finalY + 35;
        if (currentY > pageHeight - 60) { doc.addPage(); currentY = 30; }

        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'italic');
        doc.text('Note: This is an electronically generated statement. Any discrepancies must be reported within 48 hours.', 15, currentY, { maxWidth: pageWidth - 100 });

        const sigX = pageWidth - 75;
        if (signature) doc.addImage(signature, 'PNG', sigX, currentY - 20, 55, 22);
        doc.setDrawColor(15, 23, 42); doc.setLineWidth(0.6);
        doc.line(sigX - 5, currentY + 5, pageWidth - 15, currentY + 5);
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
        doc.text((selectedCompany?.ownerName || 'AUTHORIZED MANAGER').toUpperCase(), sigX - 2, currentY + 12);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
        doc.text('Authorized Signatory', sigX - 2, currentY + 17);
        doc.text(`${selectedCompany?.name || 'Authorized Fleet Management'}`, sigX - 2, currentY + 21);

        doc.setFontSize(7); doc.setTextColor(203, 213, 225);
        doc.text(`Generated on: ${formatDateIST(todayIST())}`, 15, pageHeight - 10);
    };

    const downloadSalarySlip = async (staff) => {
        try {
            setIsGeneratingPDF(true);
            const doc = new jsPDF();
            await generateSalarySlipPage(doc, staff, true);
            const monthName = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1).toLocaleString('default', { month: 'long' });
            doc.save(`${staff.name}_Salary_Slip_${monthName}_${selectedYear}.pdf`);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert("Error generating PDF: " + error.message);
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const downloadAllSalarySlips = async () => {
        const filteredReport = monthlyReport.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (!filteredReport || filteredReport.length === 0) {
            alert('No filtered payroll data available.');
            return;
        }

        const confirm = window.confirm(`Generate merged PDF for ${filteredReport.length} filtered staff members?`);
        if (!confirm) return;

        try {
            setIsGeneratingPDF(true);

            // Fetch full data with attendance logs for ALL staff for the PDF
            let url = `/api/admin/staff-attendance/${selectedCompany._id}`;
            if (isRange) {
                url += `?from=${fromDate}&to=${toDate}&includeAttendance=true`;
            } else {
                url += `?month=${selectedMonth}&year=${selectedYear}&includeAttendance=true`;
            }
            const { data: fullData } = await axios.get(url);
            const reportToUse = fullData.report || [];

            const doc = new jsPDF();
            for (let i = 0; i < reportToUse.length; i++) {
                const staffData = reportToUse[i];
                if (searchTerm && !staffData.name.toLowerCase().includes(searchTerm.toLowerCase())) continue;
                await generateSalarySlipPage(doc, staffData, i === 0);
            }

            const monthName = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1).toLocaleString('default', { month: 'long' });
            const fileName = isRange
                ? `Bulk_Staff_Slips_${fromDate}_to_${toDate}.pdf`
                : `Bulk_Staff_Slips_${monthName}_${selectedYear}.pdf`;

            doc.save(fileName);
        } catch (error) {
            console.error('Bulk PDF Error:', error);
            alert("Error generating bulk PDF: " + error.message);
        } finally {
            setIsGeneratingPDF(false);
        }
    };





    const handleAddStaff = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                companyId: selectedCompany._id,
                officeLocation: {
                    ...formData.officeLocation,
                    latitude: formData.officeLocation.latitude ? Number(formData.officeLocation.latitude) : undefined,
                    longitude: formData.officeLocation.longitude ? Number(formData.officeLocation.longitude) : undefined,
                    radius: formData.officeLocation.radius ? Number(formData.officeLocation.radius) : 200
                }
            };


            if (isEditing) {
                await axios.put(`/api/admin/staff/${editingStaffId}`, payload);
                alert('Staff updated successfully');
            } else {
                await axios.post('/api/admin/staff', payload);
            }
            setShowAddModal(false);
            setIsEditing(false);
            setEditingStaffId(null);
            fetchStaff();
            const defaultOffice = staffList.find(s => s.officeLocation?.latitude)?.officeLocation || { latitude: '', longitude: '', address: '', radius: 200 };
            setFormData({
                name: '', mobile: '', username: '', password: '', salary: 0, monthlyLeaveAllowance: 4,
                email: '', designation: '', shiftTiming: { start: '09:00', end: '18:00' },
                officeLocation: defaultOffice,
                joiningDate: todayIST(),
                staffType: 'Company'
            });
        } catch (error) {
            alert(error.response?.data?.message || 'Error processing staff request');
        }
    };

    const handleEditStaff = (staff) => {
        setFormData({
            name: staff.name || '',
            mobile: staff.mobile || '',
            username: staff.username || '',
            password: '',
            salary: staff.salary || 0,
            monthlyLeaveAllowance: staff.monthlyLeaveAllowance || 4,
            email: staff.email || '',
            designation: staff.designation || '',
            shiftTiming: staff.shiftTiming || { start: '09:00', end: '18:00' },
            officeLocation: staff.officeLocation || { latitude: '', longitude: '', address: '', radius: 200 },
            staffType: staff.staffType || 'Company',
            joiningDate: staff.joiningDate ? toISTDateString(staff.joiningDate) : todayIST()
        });
        setEditingStaffId(staff._id);
        setIsEditing(true);
        setShowAddModal(true);
    };

    // Unified detail view
    const handleStaffClick = async (staff) => {
        setIsFetching(true);
        try {
            // Targeted Fetch for full data (including photos)
            const staffId = staff._id || staff.staffId;
            const { data } = await axios.get(`/api/admin/staff-attendance/${selectedCompany._id}?month=${selectedMonth}&year=${selectedYear}&staffId=${staffId}`);
            const report = data.report?.[0] || data.report?.find(r => r.staffId === staff._id);
            if (report) {
                setSelectedStaffReport(report);
                setView('summary');
            } else {
                setSelectedStaffReport({
                    staffId: staff._id,
                    name: staff.name,
                    designation: staff.designation,
                    salary: staff.salary,
                    presentDays: 0,
                    leavesTaken: 0,
                    sundaysWorked: 0,
                    sundaysPassed: 0,
                    finalSalary: 0,
                    attendanceData: []
                });
                setView('summary');
            }
        } catch (err) {
            console.error(err);
            // Default fallback if error
            setSelectedStaffReport({
                staffId: staff._id,
                name: staff.name,
                designation: staff.designation,
                salary: staff.salary,
                presentDays: 0,
                leavesTaken: 0,
                sundaysWorked: 0,
                finalSalary: 0,
                attendanceData: []
            });
        } finally {
            setIsFetching(false);
        }
    };

    const handleBackdateSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/admin/staff-attendance/backdate', {
                ...backdateForm,
                companyId: selectedCompany._id
            });
            setShowBackdateModal(false);
            alert('Attendance added successfully');
            fetchAttendance();
        } catch (error) {
            alert(error.response?.data?.message || 'Error adding attendance');
        }
    };

    const handleDeleteStaff = async (id) => {
        if (!window.confirm('Are you sure you want to delete this staff member?')) return;
        try {
            await axios.delete(`/api/admin/staff/${id}`);
            fetchStaff();
        } catch (error) {
            alert(error.response?.data?.message || 'Error deleting staff');
        }
    };

    const toggleStaffStatus = async (staff) => {
        const newStatus = staff.status === 'blocked' ? 'active' : 'blocked';
        try {
            await axios.put(`/api/admin/staff/${staff._id}`, { status: newStatus });
            fetchStaff();
        } catch (error) {
            alert('Error updating status');
        }
    };

    const filteredStaff = React.useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return staffList.filter(s =>
            (s.name || '').toLowerCase().includes(lowerSearch) ||
            (s.mobile || '').includes(searchTerm)
        );
    }, [staffList, searchTerm]);

    const filteredAttendance = React.useMemo(() => {
        return attendanceList.filter(record => {
            const matchesStaff = filterStaff === 'all' || record.staff?._id === filterStaff;
            const matchesDate = record.date === selectedDate;
            return matchesDate && matchesStaff;
        });
    }, [attendanceList, selectedDate, filterStaff]);

    const filteredMonthlyReport = React.useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return monthlyReport.filter(item =>
            (item.name || '').toLowerCase().includes(lowerSearch)
        );
    }, [monthlyReport, searchTerm]);

    const totalBaseSalary = React.useMemo(() => {
        return filteredMonthlyReport.reduce((acc, item) => acc + (item.salary || 0), 0);
    }, [filteredMonthlyReport]);

    const totalAdvancesAmount = React.useMemo(() => {
        return filteredMonthlyReport.reduce((acc, item) => acc + (item.totalAdvances || 0), 0);
    }, [filteredMonthlyReport]);

    const totalRemainingSalary = React.useMemo(() => {
        return filteredMonthlyReport.reduce((acc, item) => acc + (item.finalSalary || 0), 0);
    }, [filteredMonthlyReport]);

    const totalPayroll = React.useMemo(() => {
        return filteredMonthlyReport.reduce((acc, item) => acc + (item.earnedSoFar !== undefined ? item.earnedSoFar : (item.finalSalary || 0)), 0);
    }, [filteredMonthlyReport]);

    const totalPaid = React.useMemo(() => {
        return filteredMonthlyReport.reduce((acc, item) => {
            const payment = salaryPayments.find(p => p.staff === (item.staffId || item._id));
            if (payment?.status === 'paid') {
                return acc + (payment.amount || 0);
            }
            return acc;
        }, 0);
    }, [filteredMonthlyReport, salaryPayments]);

    const staffPaidCount = React.useMemo(() => {
        return filteredMonthlyReport.filter(item => {
            const payment = salaryPayments.find(p => p.staff === (item.staffId || item._id));
            return payment?.status === 'paid';
        }).length;
    }, [filteredMonthlyReport, salaryPayments]);

    const totalPending = React.useMemo(() => {
        return filteredMonthlyReport.reduce((acc, item) => acc + (item.finalSalary || 0), 0);
    }, [filteredMonthlyReport]);

    const [selectedPhoto, setSelectedPhoto] = useState(null);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return (
        <div key={location.key} className="livefeed-root" style={{ padding: 'clamp(15px, 4vw, 40px)', minHeight: '100vh', background: 'radial-gradient(circle at top right, #1e293b, #0f172a)', overflowX: 'hidden', fontFamily: "'Outfit', sans-serif" }}>
            <style>
                {`
                    @media (max-width: 768px) {
                        /* Legacy helpers */
                        .resp-grid { grid-template-columns: 1fr !important; }
                        .staff-card { grid-template-columns: 1fr !important; gap: 15px !important; }
                        .hide-mobile { display: none !important; }
                        .mobile-column { flex-direction: column !important; }

                        /* Stats grid: 2 columns */
                        .staff-stats-grid {
                            grid-template-columns: repeat(2, 1fr) !important;
                            gap: 14px !important;
                        }
                        .staff-stats-grid > div {
                            padding: 18px !important;
                            border-radius: 22px !important;
                        }
                        .staff-stats-grid > div > div:last-child {
                            padding: 12px 14px !important;
                        }

                        /* Stats value font size */
                        .staff-stats-grid .stat-number {
                            font-size: 28px !important;
                        }

                        /* Header: shrink logo */
                        .staff-header > div:first-child {
                            gap: 12px !important;
                        }
                        .staff-header > div:first-child > div:first-child {
                            width: 44px !important;
                            height: 44px !important;
                            border-radius: 14px !important;
                        }
                        .staff-header > div:first-child > div:first-child svg {
                            width: 22px !important;
                            height: 22px !important;
                        }

                        /* Hide ADD PERSONNEL text, show only icon */
                        .add-personnel-btn span.btn-label {
                            display: none !important;
                        }

                        /* Controls bar stacks vertically */
                        .staff-controls-bar {
                            flex-direction: column !important;
                            align-items: stretch !important;
                            gap: 12px !important;
                        }
                        .staff-controls-bar > * {
                            width: 100% !important;
                            min-width: 0 !important;
                            max-width: 100% !important;
                        }

                        /* Tabs scroll horizontally */
                        .staff-tabs-row {
                            overflow-x: auto !important;
                            -webkit-overflow-scrolling: touch !important;
                            scrollbar-width: none !important;
                        }
                        .staff-tabs-row::-webkit-scrollbar { display: none; }
                        .staff-tabs-row button {
                            white-space: nowrap !important;
                            padding: 8px 14px !important;
                            font-size: 10px !important;
                        }

                        /* Staff list cards */
                        .staff-member-card {
                            flex-direction: column !important;
                            align-items: flex-start !important;
                            gap: 16px !important;
                        }

                        /* Attendance / Payroll detail flex rows */
                        .attendance-row-grid {
                            grid-template-columns: 1fr !important;
                        }

                        /* Modal forms single column */
                        .staff-modal-body .grid-2col {
                            grid-template-columns: 1fr !important;
                        }
                        .staff-add-modal {
                            padding: 20px !important;
                            border-radius: 24px !important;
                        }
                    }

                    @media (max-width: 480px) {
                        .staff-stats-grid {
                            gap: 10px !important;
                        }
                        .staff-stats-grid > div {
                            padding: 14px !important;
                        }
                    }
                `}
            </style>

            <SEO title="Staff Management & Payroll" />

            {/* Photo Preview Modal */}
            <AnimatePresence>
                {selectedPhoto && (
                    <div
                        style={{ position: 'fixed', inset: 0, background: 'rgba(5, 8, 15, 0.95)', zIndex: 11000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', backdropFilter: 'blur(20px)' }}
                        onClick={() => setSelectedPhoto(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <img src={selectedPhoto} style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }} alt="Evidence" />
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                style={{ position: 'absolute', top: '-60px', right: '-10px', background: 'white', color: 'black', border: 'none', width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}
                            >
                                <X size={24} />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Background Glows */}
            <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '30%', height: '30%', background: 'radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, transparent 70%)', filter: 'blur(100px)', pointerEvents: 'none' }}></div>
            <div style={{ position: 'absolute', bottom: '10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)', filter: 'blur(100px)', pointerEvents: 'none' }}></div>

            <header style={{ paddingBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '30px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                            <div style={{ width: '48px', height: '48px', background: 'var(--primary)', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 20px -5px var(--primary-glow)' }}>
                                <Users size={24} color="black" />
                            </div>
                            <div>
                                <h1 style={{ color: 'white', fontSize: '32px', fontWeight: '900', margin: 0, letterSpacing: '-1px' }}>Staff <span style={{ color: 'var(--primary)' }}>Operations</span></h1>
                                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0, fontWeight: '600' }}>Manage personnel, attendance and monthly payroll</p>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => {
                                setIsEditing(false);
                                const defaultOffice = staffList.find(s => s.officeLocation?.latitude)?.officeLocation || { latitude: '', longitude: '', address: '', radius: 200 };
                                setFormData({
                                    name: '', mobile: '', username: '', password: '', salary: 0, monthlyLeaveAllowance: 4,
                                    email: '', designation: '', shiftTiming: { start: '09:00', end: '18:00' },
                                    officeLocation: defaultOffice,
                                    joiningDate: '',
                                    staffType: 'Company'
                                });
                                setShowAddModal(true);
                            }}
                            className="action-btn-premium"
                            style={{ background: 'var(--primary)', color: 'black', border: 'none' }}
                        >
                            <Plus size={18} /> Add Staff
                        </button>
                        <button
                            onClick={() => {
                                setBackdateForm({ ...backdateForm, staffId: '', date: '' });
                                setShowBackdateModal(true);
                            }}
                            className="action-btn-premium"
                            style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}
                        >
                            <Clock size={18} color="var(--primary)" /> Manual Duty
                        </button>
                        <button
                            onClick={() => {
                                setEditingAdvance(null);
                                setAdvanceFormData({ staffId: '', amount: '', date: todayIST(), remark: '', givenBy: 'Office' });
                                setShowAdvanceModal(true);
                            }}
                            className="action-btn-premium"
                            style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}
                        >
                            <IndianRupee size={18} color="#10b981" /> Record Advance
                        </button>
                        <button
                            onClick={exportToExcel}
                            className="action-btn-premium"
                            style={{ background: 'rgba(255,255,255,0.05)', color: 'white', width: '52px', padding: 0, justifyContent: 'center' }}
                        >
                            <Download size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <main style={{ padding: '0', maxWidth: '1600px', margin: '0 auto' }}>
                {view === 'summary' ? (
                    <div className="staff-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                        <div className="stat-card-inner">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                <p style={{ margin: 0, fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Total Base Salary</p>
                                    <h2 style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: '900', color: 'white' }}>₹{totalBaseSalary.toLocaleString()}</h2>
                                </div>
                                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px', borderRadius: '12px' }}>
                                    <IndianRupee color="white" size={20} style={{ opacity: 0.5 }} />
                                </div>
                            </div>
                        </div>

                        {totalAdvancesAmount > 0 && (
                            <div className="stat-card-inner">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Total Advances</p>
                                        <h2 style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: '900', color: '#f43f5e' }}>₹{totalAdvancesAmount.toLocaleString()}</h2>
                                    </div>
                                    <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '10px', borderRadius: '12px' }}>
                                        <ArrowDownLeft color="#f43f5e" size={20} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="stat-card-inner">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Salary Paid</p>
                                    <h2 style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: '900', color: '#10b981' }}>₹{totalPaid.toLocaleString()}</h2>
                                    {staffPaidCount > 0 && <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#10b981', opacity: 0.8, fontWeight: '800', letterSpacing: '0.5px' }}>{staffPaidCount} STAFF PAID</p>}
                                </div>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '12px' }}>
                                    <CheckCircle color="#10b981" size={20} />
                                </div>
                            </div>
                        </div>

                        <div className="stat-card-inner">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Pending Salary</p>
                                    <h2 style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: '900', color: '#fbbf24' }}>₹{totalPending.toLocaleString()}</h2>
                                </div>
                                <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '10px', borderRadius: '12px' }}>
                                    <Clock color="#fbbf24" size={20} />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="staff-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                        <div className="stat-card-inner" onClick={() => setView('list')}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Total Personnel</p>
                                    <h2 style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: '900', color: 'white' }}>{staffStats.totalStaff}</h2>
                                </div>
                                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px', borderRadius: '12px' }}>
                                    <Users color="white" size={20} style={{ opacity: 0.5 }} />
                                </div>
                            </div>
                        </div>

                        <div className="stat-card-inner" onClick={() => setView('attendance')}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Today Attendance</p>
                                    <h2 style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: '900', color: '#10b981' }}>{staffStats.todayAttendance}</h2>
                                </div>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '12px' }}>
                                    <Clock color="#10b981" size={20} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '20px',
                    marginBottom: '25px',
                    background: 'rgba(30, 41, 59, 0.4)',
                    padding: '12px',
                    borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }} className="custom-scrollbar">
                        {[
                            { id: 'list', label: 'Personnel', icon: Users },
                            { id: 'attendance', label: 'Attendance', icon: Clock },
                            { id: 'leaves', label: 'Leaves', icon: CalendarX },
                            { id: 'advances', label: 'Advances', icon: IndianRupee },
                            { id: 'summary', label: 'Payroll', icon: LayoutDashboard }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setView(tab.id)}
                                className="tab-btn-premium"
                                style={{
                                    background: view === tab.id ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                                    color: view === tab.id ? 'black' : 'rgba(255,255,255,0.5)',
                                    position: 'relative'
                                }}
                            >
                                <tab.icon size={16} /> {tab.label}
                                {tab.id === 'leaves' && staffStats.pendingLeaves > 0 && (
                                     <span style={{
                                         position: 'absolute',
                                         top: '-5px',
                                         right: '-5px',
                                         background: '#ef4444',
                                         color: 'white',
                                         fontSize: '10px',
                                         fontWeight: '900',
                                         width: '18px',
                                         height: '18px',
                                         borderRadius: '50%',
                                         display: 'flex',
                                         justifyContent: 'center',
                                         alignItems: 'center',
                                         border: '2px solid #0f172a',
                                         boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)'
                                     }}>
                                         {staffStats.pendingLeaves}
                                     </span>
                                 )}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                    <div className="premium-search-container" style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                        <Search style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} size={18} />
                        <input
                            type="text"
                            placeholder="Search Personnel..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%', height: '48px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '16px', padding: '0 15px 0 45px', color: 'white', fontSize: '13px', fontWeight: '600'
                            }}
                        />
                    </div>
                    {view === 'attendance' ? (
                        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                            <button
                                onClick={() => {
                                    const newDate = DateTime.fromISO(selectedDate).minus({ days: 1 });
                                    setSelectedDate(newDate.toISODate());
                                    setSelectedMonth(newDate.month.toString());
                                    setSelectedYear(newDate.year.toString());
                                    setSelectedDay(newDate.day.toString());
                                }}
                                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0' }}
                            >
                                <ChevronLeft size={20} />
                            </button>

                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '90px' }}>
                                <span style={{ color: 'white', fontSize: '13px', fontWeight: '800', letterSpacing: '0.5px' }}>
                                    {DateTime.fromISO(selectedDate).toFormat('dd/MM/yyyy')}
                                </span>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => {
                                        if (!e.target.value) return;
                                        setSelectedDate(e.target.value);
                                        const d = new Date(e.target.value);
                                        if (!isNaN(d.getTime())) {
                                            setSelectedMonth((d.getMonth() + 1).toString());
                                            setSelectedYear(d.getFullYear().toString());
                                            setSelectedDay(d.getDate().toString());
                                        }
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        opacity: 0,
                                        cursor: 'pointer'
                                    }}
                                />
                            </div>

                            <button
                                onClick={() => {
                                    const newDate = DateTime.fromISO(selectedDate).plus({ days: 1 });
                                    setSelectedDate(newDate.toISODate());
                                    setSelectedMonth(newDate.month.toString());
                                    setSelectedYear(newDate.year.toString());
                                    setSelectedDay(newDate.day.toString());
                                }}
                                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0' }}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <select
                                className="premium-compact-input"
                                style={{ height: '40px', border: 'none', background: 'transparent', width: '120px', fontSize: '12px', fontWeight: '800', textAlign: 'center' }}
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                            >
                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                                    <option key={i + 1} value={i + 1} style={{ background: '#0f172a' }}>{m.toUpperCase()}</option>
                                ))}
                            </select>
                            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', alignSelf: 'center' }}></div>
                            <select
                                className="premium-compact-input"
                                style={{ height: '40px', border: 'none', background: 'transparent', width: '80px', fontSize: '12px', fontWeight: '800', textAlign: 'center' }}
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                            >
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y} style={{ background: '#0f172a' }}>{y}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {/* Main Content Area */}
                <div style={{ padding: '0 0 50px 0' }}>
                    {view === 'list' && (
                        <div className="premium-panel" style={{ overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th>Personnel</th>
                                            <th>Designation</th>
                                            <th>Contact</th>
                                            <th>Join Date</th>
                                            <th>Status</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isFetching ? (
                                            <tr>
                                                <td colSpan="6">
                                                    <div style={{ textAlign: 'center', padding: '100px' }}>
                                                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block' }}>
                                                            <Settings size={48} color="var(--primary)" />
                                                        </motion.div>
                                                        <p style={{ color: 'white', marginTop: '20px', fontWeight: '800' }}>SYNCHRONIZING PERSONNEL...</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredStaff.length === 0 ? (
                                            <tr>
                                                <td colSpan="6">
                                                    <div style={{ textAlign: 'center', padding: '100px', background: 'rgba(255,255,255,0.01)', borderRadius: '24px' }}>
                                                        <Users size={48} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 20px' }} />
                                                        <h3 style={{ color: 'white', fontWeight: '900' }}>No Personnel Records</h3>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredStaff.map((staff) => (
                                            <motion.tr
                                                key={staff._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                whileHover={{
                                                    backgroundColor: 'rgba(255,255,255,0.04)',
                                                    scale: 1.002,
                                                    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)'
                                                }}
                                                style={{
                                                    background: 'rgba(255,255,255,0.02)',
                                                    borderRadius: '20px',
                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    cursor: 'pointer'
                                                }}
                                                className="staff-row-hover"
                                                onClick={() => handleEditStaff(staff)}
                                            >
                                                <td style={{ padding: '12px 25px', borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                        <div style={{
                                                            width: '44px', height: '44px', borderRadius: '12px',
                                                            background: staff.status === 'blocked' ? '#f43f5e' : 'linear-gradient(135deg, var(--primary), #d97706)',
                                                            display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '16px', fontWeight: '900', color: 'black'
                                                        }}>
                                                            {staff.profilePhoto ? <img src={staff.profilePhoto} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} alt="" /> : staff.name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: '900', color: 'white', fontSize: '15px' }}>{staff.name}</div>
                                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>@{staff.username}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 25px' }}>
                                                    <div style={{ display: 'inline-flex', padding: '4px 12px', borderRadius: '8px', background: 'rgba(251, 191, 36, 0.08)', color: 'var(--primary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
                                                        {staff.designation || 'Staff'}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 25px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>{staff.mobile}</div>
                                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{staff.staffType === 'Hotel' ? '7 Days Duty' : 'Mon-Sat Duty'}</div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 25px' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>
                                                        {formatDateIST(staff.joiningDate)}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 25px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: staff.status === 'blocked' ? '#f43f5e' : '#10b981', boxShadow: `0 0 10px ${staff.status === 'blocked' ? '#f43f5e' : '#10b981'}` }}></div>
                                                        <span style={{ fontSize: '11px', fontWeight: '800', color: staff.status === 'blocked' ? '#f43f5e' : '#10b981', textTransform: 'uppercase' }}>
                                                            {staff.status === 'blocked' ? 'Suspended' : 'Active'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 25px', borderTopRightRadius: '16px', borderBottomRightRadius: '16px', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if(window.confirm(`Are you sure you want to ${staff.status === 'blocked' ? 'unblock' : 'block'} this staff member?`)) {
                                                                    toggleStaffStatus(staff);
                                                                }
                                                            }}
                                                            title={staff.status === 'blocked' ? "Unblock Staff" : "Block Staff"}
                                                            style={{ width: '36px', height: '36px', borderRadius: '10px', background: staff.status === 'blocked' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', color: staff.status === 'blocked' ? '#10b981' : '#f43f5e', border: `1px solid ${staff.status === 'blocked' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                                        >
                                                            {staff.status === 'blocked' ? <Unlock size={14} /> : <Lock size={14} />}
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setBackdateForm({ ...backdateForm, staffId: staff._id, date: todayIST() });
                                                                setShowBackdateModal(true);
                                                            }}
                                                            title="Mark Attendance (Manual Duty)"
                                                            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                                        >
                                                            <Clock size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEditStaff(staff); }}
                                                            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteStaff(staff._id); }}
                                                            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Redesigned Selected Staff Sidebar is removed for simplicity */}
                    {/* Attendance Logs View */}
                    {
                        view === 'attendance' && (
                            <div style={{
                                background: 'rgba(30, 41, 59, 0.4)',
                                borderRadius: '32px',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                overflow: 'hidden',
                                backdropFilter: 'blur(20px)',
                                boxShadow: '0 20px 40px -20px rgba(0,0,0,0.5)'
                            }}>
                                <div style={{ overflowX: 'auto', padding: '10px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px', color: 'white', minWidth: '800px' }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left' }}>
                                                <th style={{ padding: '0 25px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>DATE</th>
                                                <th style={{ padding: '0 25px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>STAFF MEMBER</th>
                                                <th style={{ padding: '0 25px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>IN / OUT TIMES</th>
                                                <th style={{ padding: '0 25px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>EVIDENCE</th>
                                                <th style={{ padding: '0 25px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>LOCATION</th>
                                                <th style={{ padding: '0 25px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: 'right' }}>ACTIONS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {isFetching ? (
                                                <tr>
                                                    <td colSpan="5">
                                                        <div style={{ textAlign: 'center', padding: '100px' }}>
                                                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block' }}>
                                                                <Settings size={48} color="var(--primary)" />
                                                            </motion.div>
                                                            <p style={{ color: 'white', marginTop: '20px', fontWeight: '800' }}>SYNCHRONIZING ATTENDANCE...</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredAttendance.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5">
                                                        <div style={{ padding: '100px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.05)' }}>
                                                            <History size={48} color="var(--primary)" style={{ opacity: 0.2, marginBottom: '20px' }} />
                                                            <p style={{ margin: 0, fontWeight: '800', fontSize: '18px', color: 'white' }}>No Attendance found</p>
                                                            <p style={{ margin: '8px 0 0 0', fontWeight: '500', fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>There are no records for this date range.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredAttendance.map(record => (
                                                <motion.tr
                                                    key={record._id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)', scale: 1.002 }}
                                                    style={{
                                                        background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.3) 0%, rgba(15, 23, 42, 0.5) 100%)',
                                                        borderRadius: '20px',
                                                        transition: 'all 0.3s ease',
                                                        boxShadow: '0 10px 20px -10px rgba(0,0,0,0.2)'
                                                    }}
                                                >
                                                    <td style={{ padding: '20px 25px', borderTopLeftRadius: '20px', borderBottomLeftRadius: '20px' }}>
                                                        <div style={{ fontWeight: '900', color: 'var(--primary)', fontSize: '14px' }}>{formatDateIST(record.date)}</div>
                                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '800' }}>{DateTime.fromISO(record.date).toFormat('cccc')}</div>
                                                    </td>
                                                    <td style={{ padding: '20px 25px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--primary)', fontWeight: '900', fontSize: '18px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                                                {record.staff?.name?.charAt(0) || '?'}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: '900', color: 'white', fontSize: '16px', letterSpacing: '-0.3px' }}>{record.staff?.name || 'Unknown Staff'}</div>
                                                                <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '4px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>User: {record.staff?.username || 'SYSTEM'}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '20px 25px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                            {record.status === 'absent' ? (
                                                                <div style={{ background: 'rgba(251, 191, 36, 0.1)', color: 'var(--primary)', padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '900', letterSpacing: '1px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                                                                    ON LEAVE / ABSENT
                                                                </div>
                                                            ) : (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '13px', fontWeight: '900' }}>
                                                                        <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                                            <ArrowUpRight size={14} />
                                                                        </div>
                                                                        {record.punchIn?.time ? formatTimeIST(record.punchIn.time) : 'N/A'}
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: record.punchOut?.time ? '#f43f5e' : 'var(--primary)', fontSize: '13px', fontWeight: '900' }}>
                                                                        <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: record.punchOut?.time ? 'rgba(244, 63, 94, 0.1)' : 'rgba(14, 165, 233, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                                            <ArrowDownLeft size={14} />
                                                                        </div>
                                                                        {record.punchOut?.time
                                                                            ? formatTimeIST(record.punchOut.time)
                                                                            : 'ACTIVE SHIFT'
                                                                        }
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '20px 25px' }}>
                                                        <div style={{ display: 'flex', gap: '12px' }}>
                                                            {record.punchIn?.photo ? (
                                                                <motion.div whileHover={{ scale: 1.1, translateY: -2 }} onClick={() => setSelectedPhoto(record.punchIn.photo)} style={{ position: 'relative', cursor: 'zoom-in' }}>
                                                                    <img src={record.punchIn.photo} style={{ width: '50px', height: '50px', borderRadius: '14px', objectFit: 'cover', border: '2px solid rgba(16,185,129,0.3)', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }} alt="" />
                                                                    <div style={{ position: 'absolute', top: -5, right: -5, background: '#10b981', padding: '4px', borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}><ArrowUpRight size={10} color="white" /></div>
                                                                </motion.div>
                                                            ) : <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Camera size={18} style={{ opacity: 0.2 }} /></div>}

                                                            {record.punchOut?.photo ? (
                                                                <motion.div whileHover={{ scale: 1.1, translateY: -2 }} onClick={() => setSelectedPhoto(record.punchOut.photo)} style={{ position: 'relative', cursor: 'zoom-in' }}>
                                                                    <img src={record.punchOut.photo} style={{ width: '50px', height: '50px', borderRadius: '14px', objectFit: 'cover', border: '2px solid rgba(244,63,94,0.3)', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }} alt="" />
                                                                    <div style={{ position: 'absolute', top: -5, right: -5, background: '#f43f5e', padding: '4px', borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}><ArrowDownLeft size={10} color="white" /></div>
                                                                </motion.div>
                                                            ) : record.punchOut?.time ? (
                                                                <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Camera size={18} style={{ opacity: 0.2 }} /></div>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '20px 25px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                                                                <MapPin size={20} color="var(--primary)" />
                                                            </div>
                                                            <div style={{ maxWidth: '240px' }}>
                                                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {record.punchIn?.location?.address || 'Location unknown'}
                                                                </div>
                                                                {record.punchIn?.location?.latitude && (
                                                                    <a
                                                                        href={`https://www.google.com/maps?q=${record.punchIn.location.latitude},${record.punchIn.location.longitude}`}
                                                                        target="_blank" rel="noreferrer"
                                                                        style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px', display: 'inline-block', textDecoration: 'none', background: 'rgba(251, 191, 36, 0.1)', padding: '2px 8px', borderRadius: '6px' }}
                                                                    >
                                                                        OPEN MAP →
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '20px 25px', borderTopRightRadius: '20px', borderBottomRightRadius: '20px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                            <motion.button
                                                                whileHover={{ scale: 1.1, background: 'rgba(244, 63, 94, 0.2)', y: -2 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => handleDeleteStaffAttendance(record._id)}
                                                                style={{
                                                                    width: '44px',
                                                                    height: '44px',
                                                                    borderRadius: '14px',
                                                                    background: 'rgba(244, 63, 94, 0.1)',
                                                                    color: '#f43f5e',
                                                                    border: '1px solid rgba(244, 63, 94, 0.2)',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    justifyContent: 'center',
                                                                    alignItems: 'center',
                                                                    transition: '0.2s'
                                                                }}
                                                            >
                                                                <Trash2 size={18} />
                                                            </motion.button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div >
                            </div>
                        )
                    }

                    {
                        view === 'leaves' && (
                            <div style={{ display: 'grid', gap: '30px' }}>
                                {/* Pending Requests Section */}
                                <div style={{
                                    background: 'rgba(15, 23, 42, 0.4)',
                                    borderRadius: '28px',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    overflow: 'hidden',
                                    backdropFilter: 'blur(10px)',
                                    boxShadow: '0 20px 40px -20px rgba(0,0,0,0.5)'
                                }}>
                                    <div style={{ padding: '20px 25px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '10px', height: '24px', background: '#f59e0b', borderRadius: '10px' }}></div>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'white', letterSpacing: '1px' }}>PENDING LEAVE REQUESTS</h3>
                                    </div>
                                    <div style={{ overflowX: 'auto', padding: '10px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px', color: 'white', minWidth: '800px' }}>
                                            <thead>
                                                <tr style={{ textAlign: 'left' }}>
                                                    <th style={{ padding: '0 25px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>STAFF MEMBER</th>
                                                    <th style={{ padding: '0 25px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>LEAVE DATES</th>
                                                    <th style={{ padding: '0 25px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>APPLIED ON</th>
                                                    <th style={{ padding: '0 25px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: 'right' }}>ACTIONS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pendingLeaves.filter(l => l.status === 'Pending').length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4">
                                                            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                                                                <Calendar size={40} color="rgba(255,255,255,0.1)" style={{ marginBottom: '15px' }} />
                                                                <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>No pending leave requests at the moment.</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : pendingLeaves.filter(l => l.status === 'Pending').map(leave => (
                                                    <motion.tr key={leave._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px' }}>
                                                        <td style={{ padding: '18px 25px', borderTopLeftRadius: '20px', borderBottomLeftRadius: '20px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontWeight: '900' }}>{leave.staff?.name?.charAt(0)}</div>
                                                                <div>
                                                                    <div style={{ fontWeight: '900', color: 'white', fontSize: '15px' }}>{leave.staff?.name}</div>
                                                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{leave.type}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '18px 25px' }}>
                                                            <div style={{ fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {formatDateIST(leave.startDate)} <ChevronRight size={12} style={{ opacity: 0.3 }} /> {formatDateIST(leave.endDate)}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '18px 25px' }}>
                                                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>{formatDateIST(leave.appliedAt || leave.createdAt)}</div>
                                                        </td>
                                                        <td style={{ padding: '18px 25px', borderTopRightRadius: '20px', borderBottomRightRadius: '20px', textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleLeaveAction(leave._id, 'Approved')} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '8px 16px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}>APPROVE</motion.button>
                                                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleLeaveAction(leave._id, 'Rejected')} style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '8px 16px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}>REJECT</motion.button>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Approved History Section */}
                                <div style={{
                                    background: 'rgba(15, 23, 42, 0.4)',
                                    borderRadius: '28px',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    overflow: 'hidden',
                                    backdropFilter: 'blur(10px)',
                                    boxShadow: '0 20px 40px -20px rgba(0,0,0,0.5)'
                                }}>
                                    <div style={{ padding: '20px 25px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '10px', height: '24px', background: '#10b981', borderRadius: '10px' }}></div>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'white', letterSpacing: '1px' }}>APPROVED LEAVE HISTORY</h3>
                                    </div>
                                    <div style={{ overflowX: 'auto', padding: '10px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px', color: 'white', minWidth: '800px' }}>
                                            <thead>
                                                <tr style={{ textAlign: 'left' }}>
                                                    <th style={{ padding: '0 25px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>STAFF MEMBER</th>
                                                    <th style={{ padding: '0 25px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>LEAVE DATES</th>
                                                    <th style={{ padding: '0 25px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>REASON / DETAILS</th>
                                                    <th style={{ padding: '0 25px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: 'right' }}>STATUS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pendingLeaves.filter(l => {
                                                    if (l.status === 'Pending') return false;
                                                    const d = new Date(l.startDate);
                                                    return (d.getUTCMonth() + 1).toString() === selectedMonth && d.getUTCFullYear().toString() === selectedYear;
                                                }).length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4">
                                                            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                                                                <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>No leave history found for the selected period.</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : pendingLeaves.filter(l => {
                                                    if (l.status === 'Pending') return false;
                                                    const d = new Date(l.startDate);
                                                    return (d.getUTCMonth() + 1).toString() === selectedMonth && d.getUTCFullYear().toString() === selectedYear;
                                                }).map(leave => (
                                                    <motion.tr key={leave._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'rgba(255,255,255,0.015)', borderRadius: '20px' }}>
                                                        <td style={{ padding: '15px 25px', borderTopLeftRadius: '20px', borderBottomLeftRadius: '20px' }}>
                                                            <div style={{ fontWeight: '900', color: 'white', fontSize: '14px' }}>{leave.staff?.name}</div>
                                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{leave.type}</div>
                                                        </td>
                                                        <td style={{ padding: '15px 25px' }}>
                                                            <div style={{ fontSize: '12px', fontWeight: '700', color: 'white' }}>
                                                                {formatDateIST(leave.startDate)} → {formatDateIST(leave.endDate)}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '15px 25px' }}>
                                                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{leave.reason || 'No reason specified'}</div>
                                                        </td>
                                                        <td style={{ padding: '15px 25px', borderTopRightRadius: '20px', borderBottomRightRadius: '20px', textAlign: 'right' }}>
                                                            <div style={{
                                                                display: 'inline-flex', padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '900',
                                                                background: leave.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                                                color: leave.status === 'Approved' ? '#10b981' : '#f43f5e',
                                                                border: `1px solid ${leave.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)'}`
                                                            }}>
                                                                {leave.status.toUpperCase()}
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                    {
                        view === 'advances' && (
                            <div style={{ marginTop: '10px' }}>
                                <div className="premium-stat-card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.1) 0%, rgba(0,0,0,0.2) 100%)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <p className="premium-label" style={{ color: '#f43f5e' }}>Total Advances Given</p>
                                            <h2 style={{ margin: '4px 0 0 0', fontSize: '32px', fontWeight: '900', color: 'white' }}>
                                                ₹{advances.reduce((sum, a) => sum + (a.amount || 0), 0).toLocaleString()}
                                            </h2>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>Selected Period: {DateTime.fromObject({ month: parseInt(selectedMonth) }).monthLong} {selectedYear}</p>
                                        </div>
                                        <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '15px', borderRadius: '20px' }}>
                                            <IndianRupee color="#f43f5e" size={30} />
                                        </div>
                                    </div>
                                </div>

                                <div className="glass-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '24px' }}>
                                    <div style={{ padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '800' }}>Advance Payment Records</h3>
                                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>{advances.length} Records found</span>
                                    </div>
                                    <div className="table-responsive-wrapper">
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                                    <th style={{ padding: '15px 25px', textAlign: 'left', color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>Staff Member</th>
                                                    <th style={{ padding: '15px 25px', textAlign: 'left', color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>Date</th>
                                                    <th style={{ padding: '15px 25px', textAlign: 'left', color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>Amount</th>
                                                    <th style={{ padding: '15px 25px', textAlign: 'left', color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>Remark</th>
                                                    <th style={{ padding: '15px 25px', textAlign: 'right', color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {advances.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" style={{ padding: '80px 25px', textAlign: 'center' }}>
                                                            <div style={{ opacity: 0.2 }}>
                                                                <IndianRupee size={48} color="white" style={{ marginBottom: '15px' }} />
                                                                <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: 'white' }}>No advance records found.</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : advances.map((adv, idx) => (
                                                    <motion.tr key={adv._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                                        <td style={{ padding: '20px 25px' }}>
                                                            <div style={{ fontWeight: '800', color: 'white' }}>{adv.staff?.name || 'Unknown Staff'}</div>
                                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{adv.staff?.designation || 'Staff'}</div>
                                                        </td>
                                                        <td style={{ padding: '20px 25px' }}>
                                                            <div style={{ fontSize: '13px', color: 'white' }}>{formatDateIST(adv.date)}</div>
                                                        </td>
                                                        <td style={{ padding: '20px 25px' }}>
                                                            <div style={{ fontSize: '14px', fontWeight: '900', color: '#f43f5e' }}>₹{adv.amount?.toLocaleString()}</div>
                                                        </td>
                                                        <td style={{ padding: '20px 25px' }}>
                                                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{adv.remark || '-'}</div>
                                                        </td>
                                                        <td style={{ padding: '20px 25px', textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                <button
                                                                    onClick={() => handleEditAdvance(adv)}
                                                                    style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer' }}
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteAdvance(adv._id)}
                                                                    style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer' }}
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
                                </div>
                            </div>
                        )
                    }
                    {
                        view === 'summary' && (
                            <div style={{ marginTop: '10px' }}>
                                {/* Premium Payroll Intelligence Header */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                    gap: '20px',
                                    marginBottom: '20px'
                                }}>


                                    <div style={{
                                        display: 'flex',
                                        gap: '10px',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end'
                                    }}>
                                        <button
                                            onClick={downloadAllSalarySlips}
                                            style={{
                                                height: '60px', padding: '0 25px', borderRadius: '18px',
                                                background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: '800',
                                                border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '10px'
                                            }}
                                        >
                                            <FileText size={20} /> BULK SLIPS
                                        </button>
                                        <button
                                            onClick={exportPayrollToExcel}
                                            style={{
                                                height: '60px', padding: '0 25px', borderRadius: '18px',
                                                background: 'var(--primary)', color: 'black', fontWeight: '800',
                                                border: 'none', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                boxShadow: '0 10px 20px -5px var(--primary-glow)'
                                            }}
                                        >
                                            <Download size={20} /> EXPORT DATA
                                        </button>
                                    </div>
                                </div>

                                {/* Personnel Payroll Table */}
                                <div style={{
                                    background: 'rgba(15, 23, 42, 0.4)',
                                    borderRadius: '32px',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    overflow: 'hidden',
                                    backdropFilter: 'blur(20px)'
                                }}>
                                    <div style={{ overflowX: 'auto', padding: '10px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', color: 'white', minWidth: '1200px' }}>
                                            <thead>
                                                <tr style={{ textAlign: 'left' }}>
                                                    <th style={{ padding: '15px 25px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px' }}>STAFF MEMBER</th>
                                                    <th style={{ padding: '15px 25px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px' }}>ATTENDANCE</th>
                                                    <th style={{ padding: '15px 25px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px' }}>BASE SALARY</th>

                                                    <th style={{ padding: '15px 25px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px' }}>ADVANCES</th>
                                                    <th style={{ padding: '15px 25px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: 'right' }}>TOTAL SALARY</th>
                                                    <th style={{ padding: '15px 25px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px' }}>STATUS</th>
                                                    <th style={{ padding: '15px 25px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: 'right' }}>ACTIONS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {isFetching ? (
                                                    <tr>
                                                        <td colSpan="7">
                                                            <div style={{ textAlign: 'center', padding: '100px' }}>
                                                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block' }}>
                                                                    <Settings size={48} color="var(--primary)" />
                                                                </motion.div>
                                                                <p style={{ color: 'white', marginTop: '20px', fontWeight: '800' }}>CALCULATING PAYROLL DISBURSEMENTS...</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : filteredMonthlyReport.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="7">
                                                            <div style={{ textAlign: 'center', padding: '100px', background: 'rgba(255,255,255,0.01)', borderRadius: '24px' }}>
                                                                <IndianRupee size={48} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 20px' }} />
                                                                <h3 style={{ color: 'white', fontWeight: '900' }}>No Payroll Data</h3>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : filteredMonthlyReport.map((item) => (
                                                    <motion.tr
                                                        key={item.staffId}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        style={{
                                                            background: 'rgba(255,255,255,0.02)',
                                                            borderRadius: '16px',
                                                            transition: 'all 0.3s ease'
                                                        }}
                                                        className="staff-row-hover"
                                                    >
                                                        <td style={{ padding: '12px 25px', borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                                <div style={{
                                                                    width: '44px', height: '44px', borderRadius: '12px',
                                                                    background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)',
                                                                    display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '16px', fontWeight: '900', color: 'var(--primary)'
                                                                }}>
                                                                    {item.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontWeight: '900', color: 'white', fontSize: '15px' }}>{item.name}</div>
                                                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '700', textTransform: 'uppercase' }}>{item.designation || 'Specialist'}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 25px' }}>
                                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '13px', fontWeight: '900', color: '#10b981' }}>{item.presentDays} <span style={{ opacity: 0.3, fontSize: '10px' }}>PRES</span></div>
                                                                    <div style={{ fontSize: '9px', fontWeight: '800', color: '#10b981', textTransform: 'uppercase' }}>Present</div>
                                                                </div>
                                                                {item.staffType !== 'Fixed' && (
                                                                    <>
                                                                        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }}></div>
                                                                        <div>
                                                                            <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--primary)' }}>{item.paidLeavesUsed || 0} <span style={{ opacity: 0.3, fontSize: '10px' }}>PAID</span></div>
                                                                            <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase' }}>Leaves</div>
                                                                        </div>
                                                                        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }}></div>
                                                                        <div>
                                                                            <div style={{ fontSize: '13px', fontWeight: '900', color: '#fbbf24' }}>{item.availableLeavesPool || 0} <span style={{ opacity: 0.3, fontSize: '10px' }}>LEFT</span></div>
                                                                            <div style={{ fontSize: '9px', fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase' }}>Balance</div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 25px' }}>
                                                            <div style={{ fontSize: '14px', fontWeight: '800', color: 'rgba(255,255,255,0.8)' }}>₹{item.salary?.toLocaleString()}</div>
                                                        </td>

                                                        <td style={{ padding: '12px 25px' }}>
                                                            {(item.totalAdvances || 0) > 0 ? (
                                                                <>
                                                                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#f43f5e' }}>- ₹{item.totalAdvances.toLocaleString()}</div>
                                                                    <div style={{ fontSize: '9px', color: '#f43f5e', fontWeight: '800', opacity: 0.8 }}>MONTHLY ADVANCE</div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'rgba(255,255,255,0.3)' }}>₹0</div>
                                                                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: '800' }}>MONTHLY ADVANCE</div>
                                                                </>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '12px 25px', textAlign: 'right' }}>
                                                            <div style={{ fontSize: '20px', fontWeight: '1000', color: 'white' }}>₹{(item.earnedSoFar !== undefined ? item.earnedSoFar : (item.finalSalary || 0)).toLocaleString()}</div>
                                                            <div style={{ fontSize: '9px', color: 'var(--primary)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Earned So Far</div>
                                                        </td>
                                                        <td style={{ padding: '12px 25px' }}>
                                                            {(() => {
                                                                const payment = salaryPayments.find(p => p.staff === (item.staffId || item._id));
                                                                const isPaid = payment?.status === 'paid';
                                                                return (
                                                                    <div
                                                                        onClick={() => handleOpenPaymentModal(item, payment, isPaid)}
                                                                        style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '8px',
                                                                            cursor: 'pointer',
                                                                            padding: '6px 12px',
                                                                            borderRadius: '10px',
                                                                            background: isPaid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                                                                            border: `1px solid ${isPaid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`,
                                                                            width: 'fit-content'
                                                                        }}
                                                                    >
                                                                        <div style={{
                                                                            width: '8px',
                                                                            height: '8px',
                                                                            borderRadius: '50%',
                                                                            background: isPaid ? '#10b981' : '#fbbf24',
                                                                            boxShadow: `0 0 10px ${isPaid ? 'rgba(16, 185, 129, 0.5)' : 'rgba(251, 191, 36, 0.5)'}`
                                                                        }}></div>
                                                                        <span style={{ fontSize: '11px', fontWeight: '900', color: isPaid ? '#10b981' : '#fbbf24' }}>
                                                                            {isPaid ? 'PAID' : 'DUE'}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td style={{ padding: '12px 25px', borderTopRightRadius: '16px', borderBottomRightRadius: '16px', textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                <motion.button
                                                                    whileHover={{ scale: 1.1, background: 'rgba(251, 191, 36, 0.2)' }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    onClick={() => downloadSalarySlip(item)}
                                                                    style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.05)', color: 'var(--primary)', border: '1px solid rgba(251, 191, 36, 0.2)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                                                    title="Download Slip"
                                                                >
                                                                    <FileText size={16} />
                                                                </motion.button>
                                                                <motion.button
                                                                    whileHover={{ scale: 1.1, background: 'rgba(255, 255, 255, 0.1)' }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    onClick={() => handleStaffClick(item)}
                                                                    style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                                                >
                                                                    <ChevronRight size={18} />
                                                                </motion.button>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div >
                <AnimatePresence>
                    {showAddModal && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(2, 6, 23, 0.92)', backdropFilter: 'blur(20px)',
                            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100,
                            padding: '20px'
                        }}>
                            {/* Abstract Background Glows */}
                            <div style={{ position: 'absolute', top: '10%', right: '10%', width: '400px', height: '400px', background: 'rgba(251, 191, 36, 0.05)', filter: 'blur(100px)', borderRadius: '50%', zIndex: -1 }}></div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                style={{
                                    maxWidth: '1100px', width: '100%', maxHeight: '95vh',
                                    background: 'rgba(10, 15, 28, 0.85)', backdropFilter: 'blur(40px)',
                                    borderRadius: '40px', border: '1px solid rgba(255,255,255,0.1)',
                                    overflow: 'hidden', position: 'relative',
                                    display: 'flex', flexDirection: 'column',
                                    boxShadow: '0 50px 100px -20px rgba(0,0,0,0.8), 0 0 50px -10px var(--primary-glow)'
                                }}
                            >
                                <div style={{ padding: '30px 50px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ width: '64px', height: '64px', background: 'var(--primary)', borderRadius: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 20px -5px var(--primary-glow)' }}>
                                            {isEditing ? <Edit3 size={30} color="black" /> : <UserPlus size={30} color="black" />}
                                        </div>
                                        <div>
                                            <h2 style={{ fontSize: '28px', fontWeight: '1000', color: 'white', margin: 0, letterSpacing: '-0.5px' }}>{isEditing ? 'MODIFY PERSONNEL' : 'NEW STAFF RECORD'}</h2>
                                            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>{isEditing ? 'Update and refine existing staff details' : 'Onboard a new member to your organization'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => { setShowAddModal(false); setIsEditing(false); }} style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '15px', color: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleAddStaff} style={{ padding: '40px 50px', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '40px', overflowY: 'auto' }}>
                                    {/* Left Column: Profile & Access */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                        <section style={{ background: 'rgba(255,255,255,0.02)', padding: '30px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
                                                <div style={{ width: '3px', height: '18px', background: 'var(--primary)', borderRadius: '2px' }}></div>
                                                <span style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px' }}>PERSONAL IDENTITY</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Full Name</label>
                                                    <input required type="text" className="premium-compact-input" placeholder="e.g. John Doe" style={{ height: '56px', padding: '0 20px', fontSize: '15px', fontWeight: '700', borderRadius: '16px' }} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Mobile Number</label>
                                                    <input required type="number" className="premium-compact-input" placeholder="e.g. 9876543210" style={{ height: '56px', padding: '0 20px', fontSize: '15px', fontWeight: '700', borderRadius: '16px' }} value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Designation</label>
                                                    <input type="text" className="premium-compact-input" placeholder="e.g. Senior Manager" style={{ height: '56px', padding: '0 20px', fontSize: '15px', fontWeight: '700', borderRadius: '16px' }} value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} />
                                                </div>
                                            </div>
                                        </section>

                                        <section style={{ background: 'rgba(255,255,255,0.02)', padding: '30px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
                                                <div style={{ width: '3px', height: '18px', background: 'var(--primary)', borderRadius: '2px' }}></div>
                                                <span style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px' }}>SYSTEM ACCESS</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Username</label>
                                                    <input required type="text" className="premium-compact-input" placeholder="e.g. john_staff" style={{ height: '56px', padding: '0 20px', fontSize: '15px', fontWeight: '700', borderRadius: '16px' }} value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{isEditing ? 'New Password (Optional)' : 'Password'}</label>
                                                    <input 
                                                        required={!isEditing} 
                                                        type="password" 
                                                        name="staff-password"
                                                        autoComplete="new-password"
                                                        className="premium-compact-input" 
                                                        placeholder="••••••••" 
                                                        style={{ height: '56px', padding: '0 20px', fontSize: '15px', fontWeight: '700', borderRadius: '16px' }} 
                                                        value={formData.password} 
                                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                                                    />
                                                </div>
                                            </div>
                                        </section>
                                    </div>

                                    {/* Right Column: Financials & Location */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                        <section style={{ background: 'rgba(255,255,255,0.02)', padding: '30px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                                            <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)', opacity: 0.1 }}></div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
                                                <div style={{ width: '3px', height: '18px', background: 'var(--primary)', borderRadius: '2px' }}></div>
                                                <span style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px' }}>PAYROLL & LEAVE POLICY</span>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Monthly Salary</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <span style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', fontWeight: '900', fontSize: '18px' }}>₹</span>
                                                        <input required type="number" className="premium-compact-input" placeholder="0.00" style={{ width: '100%', height: '60px', padding: '0 20px 0 45px', fontSize: '20px', fontWeight: '1000', borderRadius: '18px', background: 'rgba(255,255,255,0.03)' }} value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Joining Date</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <PremiumDateInput
                                                            value={formData.joiningDate}
                                                            onChange={(v) => setFormData({ ...formData, joiningDate: v })}
                                                            required
                                                            disableCalendar={true}
                                                            inputStyle={{ fontSize: '20px', fontWeight: '1000', color: 'var(--primary)' }}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Employment Type</label>
                                                    <select className="premium-compact-input" style={{ height: '56px', padding: '0 15px', fontSize: '14px', fontWeight: '700', borderRadius: '16px' }} value={formData.staffType} onChange={(e) => setFormData({ ...formData, staffType: e.target.value })}>
                                                        <option value="Regular">REGULAR (WITH LEAVE ALLOWANCE)</option>
                                                        <option value="Fixed">FIXED (30 DAYS / NO LEAVE TRACKING)</option>
                                                    </select>
                                                </div>
                                                {formData.staffType !== 'Fixed' && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Monthly Leave Quota</label>
                                                        <input required type="number" className="premium-compact-input" placeholder="e.g. 4" style={{ height: '56px', padding: '0 20px', fontSize: '16px', fontWeight: '900', borderRadius: '16px', color: 'var(--primary)' }} value={formData.monthlyLeaveAllowance} onChange={(e) => setFormData({ ...formData, monthlyLeaveAllowance: e.target.value })} />
                                                    </div>
                                                )}
                                            </div>
                                            {formData.staffType !== 'Fixed' && (
                                                <div style={{
                                                    marginTop: '25px',
                                                    background: 'rgba(251,191,36,0.03)',
                                                    padding: '16px',
                                                    borderRadius: '20px',
                                                    border: '1px solid rgba(251,191,36,0.1)',
                                                    display: 'flex',
                                                    gap: '12px',
                                                    alignItems: 'center'
                                                }}>
                                                    <div style={{ width: '28px', height: '28px', background: 'rgba(251,191,36,0.1)', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                                        <Info size={16} color="var(--primary)" />
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '600', lineHeight: '1.5' }}>
                                                        <span style={{ color: 'var(--primary)', fontWeight: '800' }}>POLICY:</span> Unused leaves from the quota will automatically carry forward to the next month for this personnel.
                                                    </p>
                                                </div>
                                            )}
                                        </section>

                                        <section style={{ background: 'rgba(255,255,255,0.02)', padding: '30px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
                                                <MapPin size={18} color="var(--primary)" />
                                                <span style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px' }}>WORK GEOFENCING</span>
                                            </div>
                                            <OfficeGeofencePicker
                                                value={formData.officeLocation}
                                                onChange={(newLocation) => setFormData({ ...formData, officeLocation: newLocation })}
                                            />
                                        </section>

                                        <section style={{ background: 'rgba(255,255,255,0.02)', padding: '30px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
                                                <Clock size={18} color="var(--primary)" />
                                                <span style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px' }}>SHIFT TIMINGS</span>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Punch-In Time</label>
                                                    <input type="time" className="premium-compact-input" style={{ height: '56px', padding: '0 20px', fontSize: '15px', fontWeight: '700', borderRadius: '16px' }} value={formData.shiftTiming.start} onChange={(e) => setFormData({ ...formData, shiftTiming: { ...formData.shiftTiming, start: e.target.value } })} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Punch-Out Time</label>
                                                    <input type="time" className="premium-compact-input" style={{ height: '56px', padding: '0 20px', fontSize: '15px', fontWeight: '700', borderRadius: '16px' }} value={formData.shiftTiming.end} onChange={(e) => setFormData({ ...formData, shiftTiming: { ...formData.shiftTiming, end: e.target.value } })} />
                                                </div>
                                            </div>
                                        </section>

                                        <div style={{ marginTop: '10px' }}>
                                            <motion.button
                                                whileHover={{ scale: 1.02, y: -4 }}
                                                whileTap={{ scale: 0.98 }}
                                                type="submit"
                                                style={{
                                                    width: '100%', height: '70px', background: 'var(--primary)', color: 'black',
                                                    border: 'none', borderRadius: '24px', fontSize: '18px', fontWeight: '1000',
                                                    cursor: 'pointer', boxShadow: '0 20px 40px -10px var(--primary-glow)', letterSpacing: '1px',
                                                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px'
                                                }}
                                            >
                                                <CheckCircle size={24} />
                                                {isEditing ? 'UPDATE STAFF MEMBER' : 'CREATE STAFF ACCOUNT'}
                                            </motion.button>
                                        </div>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}

                    {selectedStaffReport && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(2, 6, 23, 0.98)', backdropFilter: 'blur(40px)',
                            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100,
                            padding: '20px'
                        }}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                style={{
                                    maxWidth: '1000px', width: '100%', maxHeight: '90vh',
                                    background: '#080c14', borderRadius: '40px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    overflow: 'hidden', position: 'relative',
                                    display: 'flex', flexDirection: 'column',
                                    boxShadow: '0 50px 100px -20px rgba(0,0,0,0.8)'
                                }}
                            >
                                {/* Close Button Top Right */}
                                <button
                                    onClick={() => setSelectedStaffReport(null)}
                                    style={{
                                        position: 'absolute', top: '20px', right: '20px',
                                        background: 'rgba(255,255,255,0.08)', border: 'none',
                                        color: 'white', padding: '12px', borderRadius: '50%',
                                        cursor: 'pointer', zIndex: 100, transition: '0.2s',
                                        display: 'flex', justifyContent: 'center', alignItems: 'center'
                                    }}
                                >
                                    <X size={20} />
                                </button>
                                {/* Left Side: Summary & Receipt (35%) | Right Side: Date-wise Calendar (65%) */}
                                <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', height: '100%', overflow: 'hidden', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '30%', height: '30%', background: 'radial-gradient(circle, rgba(251, 191, 36, 0.15) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }}></div>
                                    <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '30%', height: '30%', background: 'radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }}></div>

                                    {/* Sidebar: Financials */}
                                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', backdropFilter: 'blur(20px)', zIndex: 2, overflowY: 'auto' }}>
                                        <div style={{ padding: '30px 25px 20px 25px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <div style={{ width: '54px', height: '54px', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), transparent)', border: '1px solid rgba(251, 191, 36, 0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '22px', fontWeight: '800', color: 'var(--primary)', flexShrink: 0 }}>
                                                    {selectedStaffReport.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'white', margin: 0, letterSpacing: '-0.5px' }}>{selectedStaffReport.name}</h3>
                                                    <p style={{ margin: '3px 0 0 0', fontSize: '10px', color: 'var(--primary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>{selectedStaffReport.designation || 'Staff Member'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Net Payout Hero */}
                                        <div style={{
                                            margin: '16px 16px 0 16px',
                                            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.02))',
                                            borderRadius: '20px',
                                            border: '1px solid rgba(251, 191, 36, 0.3)',
                                            padding: '20px 14px',
                                            textAlign: 'center',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            flexShrink: 0
                                        }}>
                                            <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(251, 191, 36, 0.1) 0%, transparent 50%)', opacity: 0.5 }}></div>
                                            <p style={{ margin: 0, fontSize: '9px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px' }}>EARNED SO FAR</p>
                                            <h1 style={{ margin: '6px 0 0 0', fontSize: '40px', fontWeight: '900', color: 'white', letterSpacing: '-2px', textShadow: '0 0 30px rgba(251, 191, 36, 0.4)', position: 'relative' }}>
                                                <span style={{ fontSize: '14px', verticalAlign: 'top', color: 'var(--primary)', marginRight: '3px', fontWeight: '700' }}>₹</span>
                                                {(selectedStaffReport.earnedSoFar !== undefined ? selectedStaffReport.earnedSoFar : (selectedStaffReport.finalSalary || 0)).toLocaleString()}
                                            </h1>
                                            {selectedStaffReport.cycleStart && (
                                                <p style={{ margin: '6px 0 0 0', fontSize: '10px', color: 'rgba(255,255,255,0.45)', fontWeight: '600' }}>
                                                    📅 {formatDateIST(selectedStaffReport.cycleStart, { day: '2-digit', month: 'short' })} → {formatDateIST(selectedStaffReport.cycleEnd, { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                            )}
                                            <button
                                                onClick={() => downloadSalarySlip(selectedStaffReport)}
                                                disabled={isGeneratingPDF}
                                                style={{
                                                    width: '100%',
                                                    padding: '16px',
                                                    borderRadius: '18px',
                                                    background: isGeneratingPDF ? 'rgba(255,255,255,0.05)' : 'rgba(251, 191, 36, 0.1)',
                                                    border: '1px solid rgba(251, 191, 36, 0.3)',
                                                    color: 'var(--primary)',
                                                    fontSize: '12px',
                                                    fontWeight: '900',
                                                    letterSpacing: '1px',
                                                    cursor: isGeneratingPDF ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '12px',
                                                    transition: '0.3s'
                                                }}
                                            >
                                                {isGeneratingPDF ? 'GENERATING PDF...' : (
                                                    <>
                                                        <FileText size={18} />
                                                        DOWNLOAD SALARY SLIP
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {/* Detailed Breakdown */}
                                        <div style={{ padding: '12px 16px 24px 16px', flexGrow: 1 }}>
                                            {/* Formula Banner */}
                                            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: '14px', padding: '10px 12px', marginBottom: '10px' }}>
                                                <p style={{ margin: 0, fontSize: '9px', color: '#818cf8', fontWeight: '700', letterSpacing: '0.5px' }}>📐 HOW IS SALARY CALCULATED?</p>
                                                <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.65)', fontWeight: '600', lineHeight: '1.5' }}>
                                                    (Present + Sundays + Extras) × ₹{selectedStaffReport.perDaySalary || Math.round((selectedStaffReport.salary || 0) / 30)}/day
                                                </p>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {/* Salary calculation box already shows base salary, so separate block is redundant */}

                                                {/* Days Present */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16,185,129,0.07)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.14)' }}>
                                                    <div>
                                                        <p style={{ margin: 0, fontSize: '10px', color: '#10b981', fontWeight: '700' }}>✅ DAYS PRESENT</p>
                                                        <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: 'rgba(16,185,129,0.5)', fontWeight: '500' }}>Of {selectedStaffReport.workingDaysPassed || 0} working days passed</p>
                                                    </div>
                                                    <span style={{ fontWeight: '800', color: '#10b981', fontSize: '13px' }}>{selectedStaffReport.presentDays || 0} <small style={{ fontSize: '9px', opacity: 0.6 }}>days</small></span>
                                                </div>

                                                {/* Free Leaves Allowance */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(14,165,233,0.07)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(14,165,233,0.14)' }}>
                                                    <div>
                                                        <p style={{ margin: 0, fontSize: '10px', color: 'var(--primary)', fontWeight: '700' }}>🎫 TOTAL LEAVES TAKEN</p>
                                                        <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: 'rgba(14,165,233,0.5)', fontWeight: '500' }}>All leaves are unpaid as per policy</p>
                                                    </div>
                                                    <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '13px' }}>{selectedStaffReport.leavesTaken || 0} <small style={{ fontSize: '9px', opacity: 0.6 }}>days</small></span>
                                                </div>

                                                {/* Sunday Holidays (Paid) */}
                                                {(selectedStaffReport.sundaysPassed || 0) > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(251, 191, 36, 0.05)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.1)' }}>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '10px', color: 'var(--primary)', fontWeight: '700' }}>⭐ SUNDAY HOLIDAYS</p>
                                                            <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: 'rgba(251, 191, 36, 0.5)', fontWeight: '500' }}>Automatically paid rest days</p>
                                                        </div>
                                                        <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '13px' }}>{selectedStaffReport.sundaysPassed} <small style={{ fontSize: '9px', opacity: 0.6 }}>days</small></span>
                                                    </div>
                                                )}

                                                {/* Sunday Extras (Worked) */}
                                                {(selectedStaffReport.sundaysWorked || 0) > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99,102,241,0.07)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.14)' }}>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '10px', color: '#818cf8', fontWeight: '700' }}>☀️ SUNDAYS WORKED</p>
                                                            <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: 'rgba(99,102,241,0.5)', fontWeight: '500' }}>Extra pay for holiday duty</p>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <p style={{ margin: 0, fontWeight: '800', color: '#818cf8', fontSize: '13px' }}>+{selectedStaffReport.sundaysWorked} days</p>
                                                        </div>
                                                    </div>
                                                )}

                                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '2px 0' }}></div>

                                                {/* Unpaid Absences */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: (selectedStaffReport.extraLeaves || 0) > 0 ? 'rgba(244,63,94,0.08)' : 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '12px', border: `1px solid ${(selectedStaffReport.extraLeaves || 0) > 0 ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.04)'}` }}>
                                                    <div>
                                                        <p style={{ margin: 0, fontSize: '10px', color: (selectedStaffReport.extraLeaves || 0) > 0 ? '#f43f5e' : 'rgba(255,255,255,0.4)', fontWeight: '700' }}>❌ UNPAID ABSENT DAYS</p>
                                                        <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: '500' }}>Beyond free allowance → deducted</p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ margin: 0, fontWeight: '800', color: (selectedStaffReport.extraLeaves || 0) > 0 ? '#f43f5e' : 'rgba(255,255,255,0.3)', fontSize: '13px' }}>{selectedStaffReport.extraLeaves || 0} days</p>
                                                        {(selectedStaffReport.extraLeaves || 0) > 0 && (
                                                            <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#f43f5e', fontWeight: '700' }}>-₹{(selectedStaffReport.deduction || 0).toLocaleString()}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Final calc box */}
                                                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '15px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <p style={{ margin: '0 0 10px 0', fontSize: '10px', fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>LEAVE CARRY-FORWARD POOL</p>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                                                        <div>
                                                            <div style={{ fontSize: '16px', fontWeight: '900', color: 'white' }}>{selectedStaffReport.totalLeaveAccrued}</div>
                                                            <div style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.3)' }}>ACCRUED (TOTAL)</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '16px', fontWeight: '900', color: '#f43f5e' }}>{selectedStaffReport.totalLeaveUsed}</div>
                                                            <div style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.3)' }}>USED (TILL DATE)</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '16px', fontWeight: '900', color: '#10b981' }}>{selectedStaffReport.availableLeave}</div>
                                                            <div style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.3)' }}>AVAILABLE (POOL)</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(251,191,36,0.03))', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '14px', padding: '12px 14px', marginTop: '2px' }}>
                                                    <p style={{ margin: 0, fontSize: '9px', color: 'var(--primary)', fontWeight: '700', letterSpacing: '1px' }}>🧮 FINAL PAYOUT CALCULATION</p>
                                                    <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.55)', fontWeight: '600', lineHeight: '1.7' }}>
                                                        Extra Leaves: {selectedStaffReport.extraLeaves} day(s) <br />
                                                        ({selectedStaffReport.salary?.toLocaleString()} / 30) × {selectedStaffReport.extraLeaves}
                                                    </p>
                                                    <p style={{ margin: '5px 0 0 0', fontSize: '15px', fontWeight: '900', color: 'var(--primary)' }}>= ₹{(selectedStaffReport.finalSalary || 0).toLocaleString()} (TOTAL SALARY)</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Main Content: Date-wise Attendance */}
                                    <div style={{ padding: '40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '30px', zIndex: 2 }}>

                                        {/* Modal Month/Year Selection */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '15px 25px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <Calendar size={18} color="var(--primary)" />
                                                <span style={{ fontSize: '12px', fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px' }}>Select Payroll Month</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <select
                                                    className="premium-compact-input"
                                                    style={{ height: '36px', padding: '0 10px', fontSize: '12px', fontWeight: '700' }}
                                                    value={selectedMonth}
                                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                                >
                                                    {Array.from({ length: 12 }, (_, i) => (
                                                        <option key={i + 1} value={i + 1} style={{ background: '#0f172a' }}>{DateTime.fromObject({ month: i + 1 }).toFormat('MMMM')}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    className="premium-compact-input"
                                                    style={{ height: '36px', padding: '0 10px', fontSize: '12px', fontWeight: '700' }}
                                                    value={selectedYear}
                                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                                >
                                                    {[2024, 2025, 2026].map(y => <option key={y} value={y} style={{ background: '#0f172a' }}>{y}</option>)}
                                                </select>
                                                {isFetching && (
                                                    <div style={{ width: '36px', height: '36px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Settings size={16} color="var(--primary)" /></motion.div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Attendance Visual Insights */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                                <div>
                                                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'white', letterSpacing: '-0.5px' }}>
                                                        {selectedStaffReport.monthLabel ? `${selectedStaffReport.monthLabel} Cycle Calendar` : 'Salary Cycle Calendar'}
                                                    </h4>
                                                    {selectedStaffReport.cycleStart && (
                                                        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>
                                                            {formatDateIST(selectedStaffReport.cycleStart, { day: '2-digit', month: 'short', year: 'numeric' })} → {formatDateIST(selectedStaffReport.cycleEnd, { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', gap: '14px', fontSize: '11px', fontWeight: '600', marginRight: '40px', flexWrap: 'wrap' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#22c55e' }}>
                                                        <div style={{ width: '10px', height: '10px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 10px rgba(34, 197, 94, 0.5)' }}></div> PRESENT
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--primary)' }}>
                                                        <div style={{ width: '10px', height: '10px', background: 'var(--primary)', borderRadius: '50%', boxShadow: '0 0 10px rgba(14, 165, 233, 0.5)' }}></div> HALF DAY
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ef4444' }}>
                                                        <div style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)' }}></div> ABSENT
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
                                                {/* Cycle Day Cells */}
                                                {(selectedStaffReport.attendanceData || []).map((attendanceRecord, idx) => {
                                                    const isPresent = attendanceRecord.status === 'present';
                                                    const isHalfDay = attendanceRecord.status === 'half-day';
                                                    const isAbsent = attendanceRecord.status === 'absent';
                                                    const isUpcoming = attendanceRecord.status === 'upcoming';
                                                    const isSunday = attendanceRecord.isSunday;

                                                    return (
                                                        <motion.div
                                                            key={attendanceRecord.date}
                                                            whileHover={{ scale: 1.05, y: -2 }}
                                                            style={{
                                                                aspectRatio: '1',
                                                                background: isPresent ? 'rgba(16, 185, 129, 0.15)' :
                                                                    isHalfDay ? 'rgba(14, 165, 233, 0.15)' :
                                                                        isAbsent ? 'rgba(244, 63, 94, 0.15)' :
                                                                            'rgba(255,255,255,0.03)',
                                                                border: `1px solid ${isPresent ? 'rgba(16, 185, 129, 0.4)' :
                                                                    isHalfDay ? 'rgba(14, 165, 233, 0.4)' :
                                                                        isAbsent ? 'rgba(244, 63, 94, 0.4)' :
                                                                            'rgba(255,255,255,0.08)'}`,
                                                                borderRadius: '14px',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                justifyContent: 'center',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                opacity: isUpcoming ? 0.3 : 1,
                                                                position: 'relative',
                                                                overflow: 'hidden'
                                                            }}
                                                        >
                                                            {isSunday && <div style={{ position: 'absolute', top: '2px', right: '2px', width: '4px', height: '4px', background: 'var(--primary)', borderRadius: '50%' }}></div>}
                                                            <span style={{
                                                                fontSize: '12px',
                                                                fontWeight: '800',
                                                                color: isPresent ? '#10b981' : isHalfDay ? 'var(--primary)' : isAbsent ? '#f43f5e' : 'rgba(255,255,255,0.3)',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                lineHeight: '1',
                                                                marginBottom: '4px'
                                                            }}>
                                                                {attendanceRecord.day}
                                                                {(idx === 0 || attendanceRecord.day === 1) && (
                                                                    <span style={{ fontSize: '8px', opacity: 0.7, marginTop: '2px', textTransform: 'uppercase' }}>
                                                                        {DateTime.fromISO(attendanceRecord.date).toFormat('MMM')}
                                                                    </span>
                                                                )}
                                                            </span>

                                                            {isPresent ? (
                                                                <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 12px #10b981' }}></div>
                                                            ) : isHalfDay ? (
                                                                <div style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%', boxShadow: '0 0 12px var(--primary)' }}></div>
                                                            ) : isAbsent ? (
                                                                <div style={{ width: '8px', height: '8px', background: '#f43f5e', borderRadius: '50%', boxShadow: '0 0 12px #f43f5e' }}></div>
                                                            ) : null}
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Performance Intelligence HUD */}
                                        <div style={{
                                            background: 'rgba(255,255,255,0.02)',
                                            borderRadius: '28px',
                                            padding: '25px',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '30px'
                                        }}>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>PAYROLL ACCRUAL</span>
                                                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)' }}>{Math.round((selectedStaffReport.finalSalary / (selectedStaffReport.baseSalary || selectedStaffReport.salary || 1)) * 100)}%</span>
                                                </div>
                                                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(100, (selectedStaffReport.finalSalary / (selectedStaffReport.baseSalary || selectedStaffReport.salary || 1)) * 100)}%` }}
                                                        style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--primary))', boxShadow: '0 0 15px rgba(251, 191, 36, 0.3)' }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>EARNED DAYS RATE</span>
                                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#10b981' }}>{Math.round((selectedStaffReport.earnedDays / (selectedStaffReport.totalDaysInCycle || 1)) * 100) || 0}%</span>
                                                </div>
                                                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(100, (selectedStaffReport.earnedDays / (selectedStaffReport.totalDaysInCycle || 1)) * 100)}%` }}
                                                        style={{ height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)', boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Daily Log Table */}
                                        <div>
                                            <h4 style={{ margin: '0 0 25px 0', fontSize: '16px', fontWeight: '700', color: 'white', letterSpacing: '-0.5px' }}>Attendance Activity Log</h4>
                                            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ background: 'rgba(255, 255, 255, 0.03)', textAlign: 'left' }}>
                                                            <th style={{ padding: '22px 25px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: '1.5px' }}>DATE</th>
                                                            <th style={{ padding: '22px 25px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: '1.5px' }}>PHOTOS</th>
                                                            <th style={{ padding: '22px 25px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: '1.5px' }}>STATUS</th>
                                                            <th style={{ padding: '22px 25px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: '1.5px' }}>TIME (IN/OUT)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(selectedStaffReport.attendanceData || [])
                                                            .filter(log => log.status !== 'upcoming')
                                                            .sort((a, b) => b.date.localeCompare(a.date)).map(log => (
                                                                <tr key={log._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                    <td style={{ padding: '15px 20px' }}>
                                                                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>{formatDateIST(log.date, { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>{formatDateIST(log.date, { weekday: 'short' })}</div>
                                                                    </td>
                                                                    <td style={{ padding: '15px 20px' }}>
                                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                                            {log.punchIn?.photo ? (
                                                                                <div onClick={() => setSelectedPhoto(log.punchIn.photo)} style={{ cursor: 'pointer' }}>
                                                                                    <img src={log.punchIn.photo} style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} alt="In" />
                                                                                </div>
                                                                            ) : <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}><Camera size={18} style={{ opacity: 0.4 }} /></div>}
                                                                            {log.punchOut?.photo && (
                                                                                <div onClick={() => setSelectedPhoto(log.punchOut.photo)} style={{ cursor: 'pointer' }}>
                                                                                    <img src={log.punchOut.photo} style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} alt="Out" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ padding: '15px 20px' }}>
                                                                        <span style={{
                                                                            fontSize: '9px',
                                                                            fontWeight: '700',
                                                                            padding: '4px 8px',
                                                                            borderRadius: '6px',
                                                                            background: log.statusLabel === 'WEEKLY OFF' ? 'rgba(251, 191, 36, 0.15)' : (log.status === 'present' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.1)'),
                                                                            color: log.statusLabel === 'WEEKLY OFF' ? 'var(--primary)' : (log.status === 'present' ? '#22c55e' : '#ef4444')
                                                                        }}>
                                                                            {log.statusLabel || log.status.toUpperCase()}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: '15px 20px' }}>
                                                                        {log.statusLabel === 'WEEKLY OFF' ? (
                                                                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontWeight: '600' }}>PAID HOLIDAY</span>
                                                                        ) : (
                                                                            <>
                                                                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#10b981' }}>{log.punchIn?.time ? formatTimeIST(log.punchIn.time) : '--'}</div>
                                                                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#f43f5e' }}>{log.punchOut?.time ? formatTimeIST(log.punchOut.time) : '--'}</div>
                                                                            </>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {showBackdateModal && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(20px)',
                            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200,
                            padding: '20px'
                        }}>
                            {/* Abstract Background Glows */}
                            <div style={{ position: 'absolute', top: '20%', left: '30%', width: '300px', height: '300px', background: 'rgba(99, 102, 241, 0.15)', filter: 'blur(100px)', borderRadius: '50%', zIndex: -1 }}></div>
                            <div style={{ position: 'absolute', bottom: '20%', right: '30%', width: '300px', height: '300px', background: 'rgba(14, 165, 233, 0.15)', filter: 'blur(100px)', borderRadius: '50%', zIndex: -1 }}></div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                                style={{
                                    maxWidth: '540px',
                                    width: '100%',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '40px',
                                    padding: '45px',
                                    boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(255,255,255,0.02)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    backdropFilter: 'blur(40px)'
                                }}
                            >
                                {/* Header Decorative element */}
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '6px', background: 'linear-gradient(90deg, var(--primary), var(--primary), var(--primary))', backgroundSize: '200% 100%', animation: 'gradientMove 3s infinite linear' }}></div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                            <ShieldCheck size={28} color="var(--primary)" />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px' }}>Security Panel</span>
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }}></div>
                                                <span style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Admin Override</span>
                                            </div>
                                            <h2 style={{ color: 'white', fontSize: '28px', fontWeight: '900', margin: 0, letterSpacing: '-1px' }}>Mark Attendance</h2>
                                        </div>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 90, background: 'rgba(255,255,255,0.05)' }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setShowBackdateModal(false)}
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', cursor: 'pointer', width: '44px', height: '44px', borderRadius: '14px', display: 'flex', justifyContent: 'center', alignItems: "center" }}
                                    >
                                        <X size={20} />
                                    </motion.button>
                                </div>

                                <form onSubmit={handleBackdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                                    <motion.div
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '20px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}
                                    >
                                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(251, 191, 36, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <AlertCircle size={18} color="var(--primary)" />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '800', letterSpacing: '0.2px' }}>Attendance Policy</span>
                                            <span style={{ fontSize: '11px', color: 'rgba(251, 191, 36, 0.6)', fontWeight: '600' }}>Backdated entries are limited to the previous 60 days (2 Months).</span>
                                        </div>
                                    </motion.div>

                                    <div className="premium-input-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <label className="premium-label" style={{ margin: 0 }}>STAFF MEMBER</label>
                                            <User size={14} style={{ opacity: 0.3 }} color="white" />
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <select
                                                required
                                                className="premium-compact-input"
                                                value={backdateForm.staffId}
                                                onChange={(e) => setBackdateForm({ ...backdateForm, staffId: e.target.value })}
                                                style={{ background: 'rgba(255,255,255,0.04)', height: '58px', borderRadius: '18px', paddingLeft: '20px', fontSize: '15px' }}
                                            >
                                                <option value="" style={{ background: '#0B1121' }}>Identify staff member...</option>
                                                {staffList.map(s => <option key={s._id} value={s._id} style={{ background: '#0B1121' }}>{s.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                                        <div className="premium-input-group">
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    id="backdate-picker"
                                                    type="date"
                                                    required
                                                    className="premium-compact-input"
                                                    min={MIN_BACKDATE_LIMIT}
                                                    max={todayIST()}
                                                    value={backdateForm.date || ''}
                                                    onChange={(e) => setBackdateForm({ ...backdateForm, date: e.target.value })}
                                                    onClick={(e) => e.target.showPicker()}
                                                    style={{ background: 'rgba(255,255,255,0.04)', height: '58px', borderRadius: '18px', padding: '0 20px', fontSize: '15px', width: '100%' }}
                                                />
                                            </div>
                                        </div>
                                        <div className="premium-input-group">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <label className="premium-label" style={{ margin: 0 }}>OFFICIAL STATUS</label>
                                                <Target size={14} style={{ opacity: 0.3 }} color="white" />
                                            </div>
                                            <select
                                                required className="premium-compact-input"
                                                value={backdateForm.status}
                                                onChange={(e) => setBackdateForm({ ...backdateForm, status: e.target.value })}
                                                style={{
                                                    background: 'rgba(255,255,255,0.04)',
                                                    height: '58px',
                                                    borderRadius: '18px',
                                                    paddingLeft: '20px',
                                                    fontSize: '15px',
                                                    color: backdateForm.status === 'present' ? '#10b981' : backdateForm.status === 'half-day' ? 'var(--primary)' : '#f43f5e',
                                                    fontWeight: '700'
                                                }}
                                            >
                                                <option value="present" style={{ background: '#0B1121', color: '#10b981' }}>PRESENT</option>
                                                <option value="half-day" style={{ background: '#0B1121', color: 'var(--primary)' }}>HALF DAY</option>
                                                <option value="absent" style={{ background: '#0B1121', color: '#f43f5e' }}>ABSENT</option>
                                            </select>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {backdateForm.status !== 'absent' && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', overflow: 'hidden' }}
                                            >
                                                <div className="premium-input-group">
                                                    <label className="premium-label">PUNCH IN TIME</label>
                                                    <input
                                                        type="time"
                                                        className="premium-compact-input"
                                                        value={backdateForm.punchInTime}
                                                        onChange={(e) => setBackdateForm({ ...backdateForm, punchInTime: e.target.value })}
                                                        style={{ background: 'rgba(255,255,255,0.04)', height: '58px', borderRadius: '18px', padding: '0 20px' }}
                                                    />
                                                </div>
                                                <div className="premium-input-group">
                                                    <label className="premium-label">PUNCH OUT TIME</label>
                                                    <input
                                                        type="time"
                                                        className="premium-compact-input"
                                                        value={backdateForm.punchOutTime}
                                                        onChange={(e) => setBackdateForm({ ...backdateForm, punchOutTime: e.target.value })}
                                                        style={{ background: 'rgba(255,255,255,0.04)', height: '58px', borderRadius: '18px', padding: '0 20px' }}
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div style={{ marginTop: '10px' }}>
                                        <motion.button
                                            whileHover={{ scale: 1.02, y: -4, boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.5)' }}
                                            whileTap={{ scale: 0.98 }}
                                            type="submit"
                                            style={{
                                                width: '100%',
                                                height: '64px',
                                                background: 'linear-gradient(135deg, var(--primary), #4f46e5, var(--primary))',
                                                backgroundSize: '200% 200%',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '20px',
                                                fontSize: '17px',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                gap: '12px',
                                                boxShadow: '0 20px 40px -15px rgba(99, 102, 241, 0.4)',
                                                letterSpacing: '0.5px',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            <CheckCircle2 size={22} />
                                            AUTHORIZE ENTRY
                                        </motion.button>
                                        <p style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '16px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            Action will be logged in security audit history
                                        </p>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                    {showAdvanceModal && (
                        <div className="modal-overlay">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="staff-add-modal"
                                style={{ maxWidth: '500px' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                    <div>
                                        <h2 style={{ color: 'white', fontSize: '24px', margin: 0, fontWeight: '950' }}>{editingAdvance ? 'Update Advance' : 'Log Staff Advance'}</h2>
                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px', fontWeight: '700' }}>{editingAdvance ? 'Modify existing advance record.' : 'Record financial assistance for personnel.'}</p>
                                    </div>
                                    <button
                                        onClick={() => setShowAdvanceModal(false)}
                                        style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer' }}
                                    ><X size={20} /></button>
                                </div>

                                <form onSubmit={handleSaveAdvance} style={{ display: 'grid', gap: '20px' }}>
                                    <div className="premium-input-group">
                                        <label className="premium-label">SELECT STAFF MEMBER</label>
                                        <select
                                            className="premium-compact-input"
                                            required
                                            value={advanceFormData.staffId}
                                            onChange={(e) => setAdvanceFormData({ ...advanceFormData, staffId: e.target.value })}
                                            style={{ height: '54px', background: 'rgba(255,255,255,0.05)' }}
                                        >
                                            <option value="" style={{ background: '#0f172a' }}>Select personnel...</option>
                                            {staffList.map(s => (
                                                <option key={s._id} value={s._id} style={{ background: '#0f172a' }}>{s.name} ({s.designation})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div className="premium-input-group">
                                            <label className="premium-label">AMOUNT (₹)</label>
                                            <input
                                                type="number"
                                                className="premium-compact-input"
                                                placeholder="0"
                                                required
                                                value={advanceFormData.amount}
                                                onChange={(e) => setAdvanceFormData({ ...advanceFormData, amount: e.target.value })}
                                                style={{ height: '54px', background: 'rgba(255,255,255,0.05)' }}
                                            />
                                        </div>
                                        <div className="premium-input-group">
                                            <PremiumDateInput
                                                label="DATE"
                                                value={advanceFormData.date}
                                                onChange={v => setAdvanceFormData({ ...advanceFormData, date: v })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="premium-input-group">
                                        <label className="premium-label">REMARK / PURPOSE</label>
                                        <textarea
                                            className="premium-compact-input"
                                            placeholder="Ex: Urgent family need..."
                                            rows="2"
                                            value={advanceFormData.remark}
                                            onChange={(e) => setAdvanceFormData({ ...advanceFormData, remark: e.target.value })}
                                            style={{ resize: 'none', paddingTop: '15px', background: 'rgba(255,255,255,0.05)' }}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submittingAdvance}
                                        className="btn-primary"
                                        style={{ height: '56px', fontSize: '16px', fontWeight: '900', marginTop: '10px' }}
                                    >
                                        {submittingAdvance ? 'SAVING...' : (editingAdvance ? 'UPDATE ADVANCE' : 'CONFIRM ADVANCE')}
                                    </button>
                                </form>
                            </motion.div>
                        </div>
                    )}

                    {paymentModal.show && (
                        <div className="modal-overlay">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="staff-add-modal"
                                style={{ maxWidth: '400px' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                    <div>
                                        <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <IndianRupee color="var(--primary)" /> {paymentModal.isPaid ? 'Edit Payment' : 'Mark as Paid'}
                                        </h2>
                                        <p style={{ margin: '5px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                                            For {paymentModal.report?.name} ({selectedMonth} {selectedYear})
                                        </p>
                                    </div>
                                    <button onClick={() => setPaymentModal({ show: false, report: null, amount: '', paymentId: null, isPaid: false })} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer' }}>
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleSavePayment} style={{ display: 'grid', gap: '20px' }}>
                                    <div className="premium-input-group">
                                        <label className="premium-label">PAYMENT AMOUNT (₹)</label>
                                        <input

                                            type="number"
                                            className="premium-compact-input"
                                            required
                                            value={paymentModal.amount}
                                            onChange={(e) => setPaymentModal({ ...paymentModal, amount: e.target.value })}
                                            style={{ height: '54px', background: 'rgba(255,255,255,0.05)', fontSize: '20px', fontWeight: '800' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                        {paymentModal.isPaid && (
                                            <button
                                                type="button"
                                                onClick={handleMarkAsDue}
                                                style={{ flex: 1, height: '56px', fontSize: '16px', fontWeight: '900', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '16px', cursor: 'pointer' }}
                                            >
                                                MARK AS DUE
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            className="btn-primary"
                                            style={{ flex: 2, height: '56px', fontSize: '16px', fontWeight: '900' }}
                                        >
                                            {paymentModal.isPaid ? 'UPDATE PAYMENT' : 'SAVE PAYMENT'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </main >
        </div >
    );
};

export default Staff;
