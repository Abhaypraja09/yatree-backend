import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../api/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    Search, X, Car, ParkingSquare, TrendingDown, Plus,
    Calendar, User, FileText, IndianRupee, CheckCircle,
    AlertCircle, Edit2, Download, Trash2, Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany } from '../context/CompanyContext';
import SEO from '../components/SEO';
import {
    todayIST,
    toISTDateString,
    formatDateIST,
    formatTimeIST,
    formatDateTimeIST
} from '../utils/istUtils';
import PremiumDateInput from '../components/common/PremiumDateInput';

const DriverSalaries = ({ isSubComponent = false }) => {
    const { selectedCompany } = useCompany();
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .salaries-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding-top: 30px;
                gap: 20px;
            }
            .salaries-controls {
                display: flex;
                gap: 12px;
                align-items: center;
                flex-wrap: wrap;
            }
            .salaries-tabs {
                display: flex;
                gap: 15px;
                margin-bottom: 25px;
                overflow-x: auto;
                padding-bottom: 5px;
                -webkit-overflow-scrolling: touch;
            }
            .salary-tab-btn {
                padding: 10px 20px;
                border-radius: 12px;
                font-weight: 800;
                font-size: 12px;
                cursor: pointer;
                white-space: nowrap;
                transition: all 0.3s;
                border: 1px solid rgba(255,255,255,0.05);
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            .search-bar-container {
                display: flex;
                gap: 15px;
                margin-bottom: 30px;
                align-items: center;
            }
            .hide-mobile { display: block; }
            .show-mobile { display: none; }

            @media (max-width: 1024px) {
                .salaries-header {
                    flex-direction: column;
                    align-items: flex-start;
                }
                .salaries-controls {
                    width: 100%;
                }
            }

            @media (max-width: 768px) {
                .search-bar-container {
                    flex-direction: column;
                    align-items: stretch;
                }
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
                .salary-tab-btn {
                    padding: 8px 15px;
                    font-size: 11px;
                }
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);
    const [salaries, setSalaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    // ── AI AGENT SEARCH INTEGRATION ──
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchParam = params.get('search') || params.get('name') || params.get('driver');
        const monthParam = params.get('month');
        const yearParam = params.get('year');

        const tabParam = params.get('tab');

        if (searchParam) setSearchTerm(searchParam);
        if (monthParam) setMonth(Number(monthParam));
        if (yearParam) setYear(Number(yearParam));

        if (tabParam) {
            if (tabParam === 'settlement') setActiveTab('payroll');
            else setActiveTab(tabParam);
        }
    }, [location.search]);

    const [month, setMonth] = useState(new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCMonth() + 1);
    const [year, setYear] = useState(new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedDriverDetails, setSelectedDriverDetails] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('payroll');

    // Advances states
    const [advances, setAdvances] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
    const [advanceFormData, setAdvanceFormData] = useState({
        driverId: '',
        amount: '',
        date: '',
        remark: ''
    });
    const [submittingAdvance, setSubmittingAdvance] = useState(false);
    const [advanceMessage, setAdvanceMessage] = useState({ type: '', text: '' });
    const [editingAdvanceId, setEditingAdvanceId] = useState(null);

    // Loans states
    const [loans, setLoans] = useState([]);
    const [loansLoading, setLoansLoading] = useState(false);
    const [showLoanModal, setShowLoanModal] = useState(false);
    const [loanFormData, setLoanFormData] = useState({
        driverId: '',
        totalAmount: '',
        tenureMonths: '',
        monthlyEMI: '',
        startDate: '',
        remarks: ''
    });
    const [submittingLoan, setSubmittingLoan] = useState(false);
    const [editingLoanId, setEditingLoanId] = useState(null);

    // Allowances states (Special Payments like Wedding/Office Work)
    const [allowances, setAllowances] = useState([]);
    const [showAllowanceModal, setShowAllowanceModal] = useState(false);
    const [allowanceFormData, setAllowanceFormData] = useState({
        driverId: '',
        amount: '',
        date: '',
        remark: '',
        type: 'Other'
    });
    const [submittingAllowance, setSubmittingAllowance] = useState(false);
    const [allowanceMessage, setAllowanceMessage] = useState({ type: '', text: '' });
    const [editingAllowanceId, setEditingAllowanceId] = useState(null);

    useEffect(() => {
        if (selectedCompany) {
            fetchSalaries();
            fetchAdvanceData();
            fetchLoans();
            fetchAllowances();
        }
    }, [selectedCompany, month, year]);

    useEffect(() => {
        if (loanFormData.totalAmount && loanFormData.tenureMonths) {
            const emi = Math.ceil(Number(loanFormData.totalAmount) / Number(loanFormData.tenureMonths));
            setLoanFormData(prev => ({ ...prev, monthlyEMI: emi || '' }));
        }
    }, [loanFormData.totalAmount, loanFormData.tenureMonths]);

    const fetchSalaries = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            let url = `/api/admin/salary-summary/${selectedCompany._id}`;
            if (month === 'All') {
                url += `?from=${year}-04-01&to=${year + 1}-03-31`;
            } else {
                const calendarYear = (month >= 1 && month <= 3) ? year + 1 : year;
                url += `?month=${month}&year=${calendarYear}`;
            }
            const { data } = await axios.get(url, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setSalaries(data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchAdvanceData = async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            let query = `isFreelancer=false`;
            if (month === 'All') {
                query += `&from=${year}-04-01&to=${year + 1}-03-31`;
            } else {
                const calendarYear = (month >= 1 && month <= 3) ? year + 1 : year;
                query += `&month=${month}&year=${calendarYear}`;
            }

            const [advRes, driversRes] = await Promise.all([
                axios.get(`/api/admin/advances/${selectedCompany._id}?${query}`, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                }),
                axios.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false&isFreelancer=false&status=active`, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                })
            ]);
            setAdvances(advRes.data || []);
            setDrivers(driversRes.data.drivers || []);
        } catch (err) { console.error('Error fetching advance data:', err); }
    };

    const fetchLoans = async () => {
        if (!selectedCompany?._id) return;
        setLoansLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/loans/${selectedCompany._id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setLoans(data || []);
        } catch (err) {
            console.error('Error fetching loans:', err);
        } finally {
            setLoansLoading(false);
        }
    };

    const fetchAllowances = async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            let url = `/api/admin/allowances/${selectedCompany._id}`;
            if (month === 'All') {
                url += `?from=${year}-04-01&to=${year + 1}-03-31`;
            } else {
                const calendarYear = (month >= 1 && month <= 3) ? year + 1 : year;
                url += `?month=${month}&year=${calendarYear}`;
            }
            const { data } = await axios.get(url, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setAllowances(data || []);
        } catch (err) { console.error('Error fetching allowances:', err); }
    };

    const filteredLoans = useMemo(() => {
        if (!loans) return [];

        let processedLoans = loans;

        if (month === 'All') {
            const fyStartValue = (year * 12) + 4; // April of start year
            const fyEndValue = ((year + 1) * 12) + 3; // March of end year

            processedLoans = loans.filter(loan => {
                if (!loan.startDate) return true;
                const start = new Date(loan.startDate);
                const loanStartValue = (start.getFullYear() * 12) + (start.getMonth() + 1);

                const tenure = parseInt(loan.tenureMonths, 10) || (loan.monthlyEMI > 0 ? Math.round(loan.totalAmount / loan.monthlyEMI) : 12);
                const loanEndValue = loanStartValue + tenure - 1;

                // Show if loan overlaps with this FY
                const overlapsFY = (loanStartValue <= fyEndValue) && (loanEndValue >= fyStartValue);
                return overlapsFY && (loan.status !== 'Completed');
            });
        } else {
            const currentMonthNum = Number(month);
            const calendarYear = (currentMonthNum >= 1 && currentMonthNum <= 3) ? year + 1 : year;
            const currentYearNum = Number(calendarYear);
            const selectedMonthValue = (currentYearNum * 12) + currentMonthNum;

            processedLoans = loans.filter(loan => {
                if (!loan.startDate) return true;
                const start = new Date(loan.startDate);
                const loanStartValue = (start.getFullYear() * 12) + (start.getMonth() + 1);

                if (loanStartValue > selectedMonthValue) return false;

                const tenure = parseInt(loan.tenureMonths, 10) || (loan.monthlyEMI > 0 ? Math.round(loan.totalAmount / loan.monthlyEMI) : 12);
                const loanEndValue = loanStartValue + tenure - 1;

                const isDuringTenure = selectedMonthValue <= loanEndValue;
                const isActiveStatus = loan.status !== 'Completed';

                return isDuringTenure && isActiveStatus;
            });
        }

        // Apply Search Filter and Sort
        return processedLoans
            .filter(l =>
                l.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                l.remarks?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => (a.driver?.name || '').localeCompare(b.driver?.name || ''));
    }, [loans, month, year, searchTerm]);

    const handleRecordLoan = async (e) => {
        if (e) e.preventDefault();
        setSubmittingLoan(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            if (editingLoanId) {
                await axios.put(`/api/admin/loans/${editingLoanId}`, {
                    ...loanFormData,
                    remainingAmount: loanFormData.totalAmount // In a simple edit, we might reset or keep track, but for now we update basic info
                }, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
            } else {
                await axios.post('/api/admin/loans', {
                    ...loanFormData,
                    companyId: selectedCompany._id
                }, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
            }
            setShowLoanModal(false);
            setEditingLoanId(null);
            setLoanFormData({ driverId: '', totalAmount: '', tenureMonths: '', monthlyEMI: '', startDate: '', remarks: '' });
            fetchLoans();
            fetchSalaries();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save loan');
        } finally {
            setSubmittingLoan(false);
        }
    };

    const handleEditLoan = (loan) => {
        setEditingLoanId(loan._id);
        const tenure = loan.tenureMonths || (loan.monthlyEMI > 0 ? Math.round(loan.totalAmount / loan.monthlyEMI) : '');
        setLoanFormData({
            driverId: loan.driver?._id || loan.driver,
            totalAmount: loan.totalAmount,
            tenureMonths: tenure,
            monthlyEMI: loan.monthlyEMI,
            startDate: loan.startDate ? toISTDateString(loan.startDate) : '',
            remarks: loan.remarks || ''
        });
        setShowLoanModal(true);
    };

    const handleDeleteLoan = async (id) => {
        if (!window.confirm('Are you sure you want to delete this loan? This will remove all repayment history.')) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.delete(`/api/admin/loans/${id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            fetchLoans();
            fetchSalaries();
        } catch (err) {
            alert('Failed to delete loan');
        }
    };

    const handleAddAdvance = async (e) => {
        e.preventDefault();
        setSubmittingAdvance(true);
        setAdvanceMessage({ type: '', text: '' });
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            if (editingAdvanceId) {
                await axios.put(`/api/admin/advances/${editingAdvanceId}`, {
                    ...advanceFormData,
                    companyId: selectedCompany._id
                }, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
                setAdvanceMessage({ type: 'success', text: 'Advance updated successfully!' });
            } else {
                await axios.post('/api/admin/advances', {
                    ...advanceFormData,
                    companyId: selectedCompany._id
                }, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
                setAdvanceMessage({ type: 'success', text: 'Advance recorded successfully!' });
            }

            setTimeout(() => {
                setShowAdvanceModal(false);
                setEditingAdvanceId(null);
                setAdvanceFormData({
                    driverId: '',
                    amount: '',
                    date: '',
                    remark: ''
                });
                setAdvanceMessage({ type: '', text: '' });
                fetchSalaries();
                fetchAdvanceData();
            }, 1500);
        } catch (err) {
            setAdvanceMessage({ type: 'error', text: err.response?.data?.message || 'Operation failed' });
        } finally {
            setSubmittingAdvance(false);
        }
    };

    const handleEditClick = (advance) => {
        setEditingAdvanceId(advance._id);
        setAdvanceFormData({
            driverId: advance.driver?._id || '',
            amount: advance.amount || '',
            date: advance.date ? toISTDateString(advance.date) : '',
            remark: advance.remark || ''
        });
        setShowAdvanceModal(true);
    };

    const handleDeleteAdvance = async (id) => {
        if (!window.confirm('Are you sure you want to delete this advance record?')) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.delete(`/api/admin/advances/${id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            fetchSalaries();
            fetchAdvanceData();
        } catch (err) {
            console.error('Failed to delete advance:', err);
            alert('Failed to delete advance record');
        }
    };

    const handleAddAllowance = async (e) => {
        e.preventDefault();
        setSubmittingAllowance(true);
        setAllowanceMessage({ type: '', text: '' });
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const payload = { ...allowanceFormData, companyId: selectedCompany._id };
            if (editingAllowanceId) {
                await axios.put(`/api/admin/allowances/${editingAllowanceId}`, payload, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
                setAllowanceMessage({ type: 'success', text: 'Payment updated successfully!' });
            } else {
                await axios.post('/api/admin/allowances', payload, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
                setAllowanceMessage({ type: 'success', text: 'Payment recorded successfully!' });
            }

            setTimeout(() => {
                setShowAllowanceModal(false);
                setEditingAllowanceId(null);
                setAllowanceFormData({ driverId: '', amount: '', date: '', remark: '', type: 'Other' });
                setAllowanceMessage({ type: '', text: '' });
                fetchSalaries();
                fetchAllowances();
            }, 1000);
        } catch (err) {
            setAllowanceMessage({ type: 'error', text: err.response?.data?.message || 'Operation failed' });
        } finally {
            setSubmittingAllowance(false);
        }
    };

    const handleEditAllowance = (a) => {
        setEditingAllowanceId(a._id);
        setAllowanceFormData({
            driverId: a.driver?._id || '',
            amount: a.amount || '',
            date: a.date ? toISTDateString(a.date) : '',
            remark: a.remark || '',
            type: a.type || 'Other'
        });
        setShowAllowanceModal(true);
    };

    const handleDeleteAllowance = async (id) => {
        if (!window.confirm('Are you sure you want to delete this payment record?')) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.delete(`/api/admin/allowances/${id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            fetchSalaries();
            fetchAllowances();
        } catch (err) {
            alert('Failed to delete payment record');
        }
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

    const handleExportPDF = async (data = selectedDriverDetails) => {
        try {
            if (!data) {
                alert("No data available to download.");
                return;
            }

            const logoUrl = selectedCompany?.logoUrl || '/logos/logo.png';
            const logo = await loadImage(logoUrl).catch(() => null);

            const sigUrl = selectedCompany?.ownerSignatureUrl || '/logos/signature.png';
            const signature = await loadImage(sigUrl).catch(() => null);

            const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
            const periodLabel = `${monthName} ${year}`;
            const driverInfo = data.driver || {};
            const summary = data.summary || {};

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // 1. HEADER (LUXURY STYLE)
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, pageWidth, 50, 'F');

            // Premium Logo Container
            if (logo) {
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(12, 8, 34, 34, 3, 3, 'F'); // White background for logo
                doc.addImage(logo, 'PNG', 14, 10, 30, 30);
            } else {
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
            doc.text('SALARY SLIP', pageWidth - 15, 22, { align: 'right' });
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
            doc.text('MOBILE', 15, 84);
            doc.text('DESIGNATION', 15, 92);

            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.text((driverInfo.name || 'N/A').toUpperCase(), 45, 76);
            doc.text(driverInfo.mobile || 'N/A', 45, 84);
            doc.text('PROFESSIONAL DRIVER', 45, 92);

            // Summary Box
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(pageWidth / 2, 60, pageWidth / 2 - 15, 40, 3, 3, 'F');
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('PAYMENT OVERVIEW', pageWidth / 2 + 5, 68);

            const totalEarned = summary.grandTotal || ((summary.totalWages || 0) + (summary.parkingTotal || 0));
            const totalEMI = Number(summary.totalEMI) || 0;
            const netPayable = summary.netPayable || (totalEarned - (summary.totalAdvances || 0) - totalEMI);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text('Duties & Parking:', pageWidth / 2 + 5, 74);
            doc.text('Special Pay (Bonuses):', pageWidth / 2 + 5, 78);
            doc.text('Advances Deducted:', pageWidth / 2 + 2, 82);
            doc.text('EMI Deduction (Loan):', pageWidth / 2 + 2, 86);

            doc.setTextColor(15, 23, 42);
            doc.text(`Rs. ${((summary.totalWages || 0) + (summary.parkingTotal || 0)).toLocaleString('en-IN')}`, pageWidth - 20, 74, { align: 'right' });
            doc.setTextColor(16, 185, 129);
            doc.text(`+ Rs. ${(summary.totalAllowances || 0).toLocaleString('en-IN')}`, pageWidth - 20, 78, { align: 'right' });
            doc.setTextColor(244, 63, 94);
            doc.text(`- Rs. ${(summary.totalAdvances || 0).toLocaleString('en-IN')}`, pageWidth - 20, 82, { align: 'right' });
            doc.text(`- Rs. ${totalEMI.toLocaleString('en-IN')}`, pageWidth - 20, 86, { align: 'right' });

            doc.setDrawColor(203, 213, 225);
            doc.line(pageWidth / 2 + 5, 90, pageWidth - 20, 90);

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(16, 185, 129);
            doc.text('NET PAYABLE:', pageWidth / 2 + 5, 98);
            doc.text(`Rs. ${netPayable.toLocaleString('en-IN')}`, pageWidth - 20, 98, { align: 'right' });

            // 3. DUTY LOGS TABLE
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('DUTY & TRIP DETAILS', 15, 115);

            const showSDR = (driverInfo.sameDayReturnBonus > 0 || driverInfo.sameDayReturnEnabled);
            const showNight = (driverInfo.nightStayBonus > 0);

            const tableHeader = ['DATE', 'WAGE'];
            if (showSDR) tableHeader.push('SAME DAY');
            if (showNight) tableHeader.push('NIGHT STAY');
            tableHeader.push('PARKING', 'TOTAL');

            const dutyRows = (data.breakdown || []).map(day => {
                const row = [
                    formatDateIST(day.date),
                    `Rs. ${(day.wage || 0).toLocaleString('en-IN')}`
                ];
                if (showSDR) row.push(`Rs. ${(day.sameDayReturn || 0).toLocaleString('en-IN')}`);
                if (showNight) row.push(`Rs. ${(day.nightStay || 0).toLocaleString('en-IN')}`);
                row.push(
                    `Rs. ${(day.parking || 0).toLocaleString('en-IN')}`,
                    `Rs. ${(day.total || 0).toLocaleString('en-IN')}`
                );
                return row;
            });

            autoTable(doc, {
                head: [tableHeader],
                body: dutyRows,
                startY: 120,
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42], fontSize: 8, halign: 'center' },
                bodyStyles: { fontSize: 8, halign: 'center', textColor: [51, 65, 85] },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 15, right: 15 }
            });

            // 4. ADVANCES TABLE
            let currentY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 120) + 15;
            if (currentY > pageHeight - 80) { doc.addPage(); currentY = 20; }
            doc.setTextColor(15, 23, 42); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
            doc.text('ADVANCES', 15, currentY);

            const advRows = (data.advances || []).map(adv => [
                formatDateIST(adv.date),
                (adv.remark || '').toUpperCase(),
                `Rs. ${(adv.amount || 0).toLocaleString('en-IN')}`,
                (adv.status || 'PENDING').toUpperCase() === 'PENDING' ? 'PAID' : (adv.status || '').toUpperCase()
            ]);

            autoTable(doc, {
                head: [['DATE', 'PARTICULARS', 'AMOUNT (Rs.)', 'STATUS']],
                body: advRows,
                startY: currentY + 5,
                theme: 'striped',
                headStyles: { fillColor: [244, 63, 94], fontSize: 8, halign: 'center' },
                bodyStyles: { fontSize: 8, halign: 'center', textColor: [51, 65, 85] },
                margin: { left: 15, right: 15 }
            });

            // 5. SPECIAL PAYMENTS (ALLOWANCES) TABLE 
            currentY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : currentY) + 15;
            if (currentY > pageHeight - 80) { doc.addPage(); currentY = 20; }
            doc.setTextColor(15, 23, 42); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
            doc.text('SPECIAL PAYMENTS (ALLOWANCES)', 15, currentY);

            const allowRows = (data.allowances || []).map(al => [
                formatDateIST(al.date),
                (al.type || '').toUpperCase(),
                (al.remark || '').toUpperCase(),
                `Rs. ${(al.amount || 0).toLocaleString('en-IN')}`
            ]);

            if (allowRows.length > 0) {
                autoTable(doc, {
                    head: [['DATE', 'TYPE', 'REMARKS', 'AMOUNT (Rs.)']],
                    body: allowRows,
                    startY: currentY + 5,
                    theme: 'striped',
                    headStyles: { fillColor: [16, 185, 129], fontSize: 8, halign: 'center' },
                    bodyStyles: { fontSize: 8, halign: 'center', textColor: [51, 65, 85] },
                    margin: { left: 15, right: 15 }
                });
                currentY = doc.lastAutoTable.finalY;
            } else {
                doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(150, 150, 150);
                doc.text('No special payments recorded for this period.', 15, currentY + 10);
                currentY += 15;
            }

            // 6. LOAN & EMI SECTION
            currentY += 15;
            if (currentY > pageHeight - 80) { doc.addPage(); currentY = 20; }
            doc.setTextColor(15, 23, 42); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
            doc.text('LOANS & EMI PROGRESS', 15, currentY);

            const loanRows = (data.loans || []).map(loan => {
                const sDate = new Date(loan.startDate);
                const sVal = (sDate.getFullYear() * 12) + (sDate.getMonth() + 1);
                const selVal = (parseInt(year) * 12) + parseInt(month);
                const monthIdx = (selVal - sVal) + 1;

                const tenure = parseInt(loan.tenureMonths, 10) || (loan.monthlyEMI > 0 ? Math.round(loan.totalAmount / loan.monthlyEMI) : 1);
                const isCompleted = loan.status === 'Completed';

                let progress = '';
                if (isCompleted) {
                    progress = 'Completed';
                } else if (monthIdx <= 0) {
                    progress = 'Upcoming';
                } else if (monthIdx > tenure) {
                    progress = `Extended (Month ${monthIdx} of ${tenure})`;
                } else {
                    progress = `Month ${monthIdx} of ${tenure}`;
                }

                return [
                    formatDateIST(loan.startDate),
                    `Rs. ${loan.totalAmount?.toLocaleString()}`,
                    `Rs. ${loan.monthlyEMI?.toLocaleString()}`,
                    (() => {
                        const sDate = new Date(loan.startDate);
                        const sVal = (sDate.getFullYear() * 12) + (sDate.getMonth() + 1);
                        const calendarYear = (month >= 1 && month <= 3) ? year + 1 : year;
                        const selVal = (parseInt(calendarYear) * 12) + parseInt(month);
                        const mIdx = (selVal - sVal) + 1;
                        const histRem = Math.max(0, loan.totalAmount - (loan.monthlyEMI * mIdx));
                        return `Rs. ${histRem.toLocaleString()}`;
                    })(),
                    progress,
                    loan.status?.toUpperCase()
                ];
            });

            if (loanRows.length > 0) {
                autoTable(doc, {
                    head: [['LOAN DATE', 'TOTAL AMOUNT', 'EMI AMOUNT', 'REMAINING', 'EMI PROGRESS', 'STATUS']],
                    body: loanRows,
                    startY: currentY + 5,
                    theme: 'grid',
                    headStyles: { fillColor: [99, 102, 241], fontSize: 8, halign: 'center' },
                    bodyStyles: { fontSize: 8, halign: 'center', textColor: [51, 65, 85] },
                    margin: { left: 15, right: 15 }
                });
                currentY = doc.lastAutoTable.finalY;
            } else {
                doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(150, 150, 150);
                doc.text('No active or historical loans recorded for this driver.', 15, currentY + 10);
                currentY += 15;
            }

            // 6. SIGNATURE & FOOTER
            currentY += 35;
            if (currentY > pageHeight - 60) { doc.addPage(); currentY = 30; }

            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.setFont('helvetica', 'italic');
            doc.text('Note: This is an electronically generated statement. Any discrepancies must be reported to the accounts department within 48 hours for rectification.', 15, currentY, { maxWidth: pageWidth - 100 });

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
            doc.text(`Generated on: ${formatDateTimeIST(new Date())}`, 15, pageHeight - 10);

            doc.save(`Salary_Slip_${(driverInfo.name || 'Driver').replace(/\s+/g, '_')}_${monthName}.pdf`);
        } catch (error) {
            console.error(error);
            alert("Error generating PDF: " + error.message);
        }
    };

    const handleQuickDownload = async (driverId) => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/salary-details/${driverId}?month=${month}&year=${year}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            handleExportPDF(data);
        } catch (err) {
            alert('Error downloading slip');
        }
    };

    const fetchDriverDetails = async (driverId) => {
        setDetailLoading(true);
        setShowDetailModal(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            let url = `/api/admin/salary-details/${driverId}`;
            if (month === 'All') {
                url += `?from=${year}-04-01&to=${year + 1}-03-31`;
            } else {
                const calendarYear = (month >= 1 && month <= 3) ? year + 1 : year;
                url += `?month=${month}&year=${calendarYear}`;
            }
            const { data } = await axios.get(url, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setSelectedDriverDetails(data);
        } catch (err) {
            console.error('Error fetching driver details:', err);
            setShowDetailModal(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const filteredSalaries = salaries
        .filter(s =>
            s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.mobile?.includes(searchTerm)
        )
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const filteredAdvances = advances
        .filter(a =>
            a.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.remark?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => (a.driver?.name || '').localeCompare(b.driver?.name || ''));



    const filteredAllowances = (allowances || [])
        .filter(a =>
            a.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.remark?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => (a.driver?.name || '').localeCompare(b.driver?.name || ''));

    const totalGrossEarnings = filteredSalaries.reduce((sum, s) => sum + (s.totalEarned || 0), 0);
    const totalNetPayout = filteredSalaries.reduce((sum, s) => sum + (s.netPayable || 0), 0);
    const totalSpecialPay = filteredSalaries.reduce((sum, s) => sum + (s.totalAllowances || 0), 0);
    const totalAdvancesTotal = filteredSalaries.reduce((sum, s) => sum + (s.totalAdvances || 0), 0);
    const totalEMITotal = filteredSalaries.reduce((sum, s) => sum + (s.totalEMI || 0), 0);

    const det = selectedDriverDetails;
    const dInfo = det?.driver?.name ? det.driver : (det?.driver?.[0] || {});
    const driverName = dInfo.name || '';
    const breakdown = det?.breakdown || [];
    const summary = det?.summary || {};

    // Explicitly calculate totals from breakdown to ensure consistency with the table
    const calcWages = breakdown.reduce((s, d) => s + (d.wage || 0), 0);
    const calcSDR = breakdown.reduce((s, d) => s + (d.sameDayReturn || 0), 0);
    const calcNight = breakdown.reduce((s, d) => s + (d.nightStay || 0), 0);
    // Use backend-calculated parking total to avoid double counting across duties and standalone entries
    const calcParking = summary.parkingTotal || 0;
    const calcOT = summary.totalOT || 0;
    const calcSpecialPay = breakdown.reduce((s, d) => s + (d.specialPay || 0), 0);
    const calcOtherBonuses = breakdown.reduce((s, d) => s + (d.otherBonuses || 0), 0);

    // Combined Routine Earnings (Everything related to duties)
    const routineEarningsTotal = calcWages + calcSDR + calcNight + calcOT + calcSpecialPay + calcOtherBonuses;

    // Other Adjustments
    const totalAllowances = summary.totalAllowances || 0;
    const totalAdvances = summary.totalAdvances || 0;
    const totalEMI = Number(summary.totalEMI) || 0;

    // Final Combined Totals
    const grossPayroll = routineEarningsTotal + totalAllowances + calcParking;
    const netPayable = grossPayroll - totalAdvances - totalEMI;

    // Visibility logic for Bonuses - Restore to visible by default for Drivers as requested
    const showSDR = dInfo.role === 'Driver' || dInfo.sameDayReturnBonus > 0 || dInfo.sameDayReturnEnabled || calcSDR > 0;
    const showNight = dInfo.role === 'Driver' || dInfo.nightStayBonus > 0 || calcNight > 0;

    return (
        <div className={isSubComponent ? "sub-component" : "container-fluid"} style={{ paddingBottom: '40px' }}>
            {!isSubComponent && <SEO title="Driver Payroll" description="View driver salary reports, duty days, and advances." />}

            {/* Header */}
            {!isSubComponent && (
                <header className="salaries-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: 'clamp(40px,10vw,50px)', height: 'clamp(40px,10vw,50px)', background: 'linear-gradient(135deg, white, #f8fafc)', borderRadius: '16px', padding: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                            <IndianRupee size={28} color="var(--primary)" />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 8px var(--primary)' }}></div>
                                <span style={{ fontSize: 'clamp(9px,2.5vw,10px)', fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>Payroll System</span>
                            </div>
                            <h1 style={{ color: 'white', fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: '900', margin: 0, letterSpacing: '-1px', cursor: 'pointer' }}>
                                Driver <span className="text-gradient-yellow">Salaries</span>
                            </h1>
                        </div>
                    </div>

                    <div className="salaries-controls">
                        {/* MONTH SELECTOR */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'rgba(15, 23, 42, 0.4)',
                            borderRadius: '16px',
                            padding: '4px 8px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                            height: '48px'
                        }}>
                            <select
                                value={month}
                                onChange={(e) => setMonth(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white', fontWeight: '900', fontSize: '14px', padding: '0 10px',
                                    height: '100%', outline: 'none', cursor: 'pointer'
                                }}
                            >
                                <option value="All" style={{ background: '#0f172a' }}>Full Year</option>
                                {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map(m => (
                                    <option key={m} value={m} style={{ background: '#0f172a' }}>
                                        {new Date(0, m - 1).toLocaleString('default', { month: 'short' })}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* FINANCIAL YEAR SELECTOR */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'rgba(15, 23, 42, 0.4)',
                            borderRadius: '16px',
                            padding: '4px 15px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                            height: '48px',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>FY</span>
                            <select
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white', fontWeight: '900', fontSize: '14px',
                                    outline: 'none', cursor: 'pointer'
                                }}
                            >
                                {[2023, 2024, 2025, 2026, 2027].map(y => (
                                    <option key={y} value={y} style={{ background: '#0f172a' }}>
                                        {y}-{String(y + 1).slice(-2)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="glass-card" style={{ padding: '0', display: 'flex', alignItems: 'center', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', height: '48px', background: 'rgba(15, 23, 42, 0.4)' }}>
                            <Search size={18} style={{ margin: '0 15px', color: 'rgba(255,255,255,0.4)' }} />
                            <input type="text" placeholder="Search..." value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'white', height: '100%', outline: 'none', width: '120px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <button
                                onClick={() => setShowAdvanceModal(true)}
                                className="btn-primary"
                                style={{ height: '38px', padding: '0 15px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', border: 'none' }}
                            >
                                <TrendingDown size={14} /> <span className="hide-mobile">ADVANCE</span><span className="show-mobile">ADV</span>
                            </button>
                            <button
                                onClick={() => { setEditingLoanId(null); setLoanFormData({ driverId: '', totalAmount: '', tenureMonths: '', monthlyEMI: '', remarks: '' }); setShowLoanModal(true); }}
                                className="btn-primary"
                                style={{ height: '38px', padding: '0 15px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: 'none' }}
                            >
                                <Wallet size={14} /> <span className="hide-mobile">LOAN</span><span className="show-mobile">LOAN</span>
                            </button>
                            <button
                                onClick={() => { setEditingAllowanceId(null); setAllowanceFormData({ driverId: '', amount: '', date: todayIST(), remark: '', type: 'Other' }); setShowAllowanceModal(true); }}
                                className="btn-primary"
                                style={{ height: '38px', padding: '0 15px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'none' }}
                            >
                                <Plus size={14} /> <span className="hide-mobile">SPECIAL PAY</span><span className="show-mobile">PAY</span>
                            </button>
                        </div>
                    </div>
                </header>
            )}

            {isSubComponent && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>Salaries & Settlements</h2>
                        <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', fontSize: '10px', fontWeight: '900', letterSpacing: '0.5px' }}>MONTHLY REPORT</span>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* MONTH SELECTOR */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'rgba(15, 23, 42, 0.4)',
                            borderRadius: '16px',
                            padding: '4px 8px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                            height: '48px'
                        }}>
                            <select
                                value={month}
                                onChange={(e) => setMonth(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white', fontWeight: '900', fontSize: '14px', padding: '0 10px',
                                    height: '100%', outline: 'none', cursor: 'pointer'
                                }}
                            >
                                <option value="All" style={{ background: '#0f172a' }}>Full Year</option>
                                {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map(m => (
                                    <option key={m} value={m} style={{ background: '#0f172a' }}>
                                        {new Date(0, m - 1).toLocaleString('default', { month: 'short' })}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* FINANCIAL YEAR SELECTOR */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'rgba(15, 23, 42, 0.4)',
                            borderRadius: '16px',
                            padding: '4px 15px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                            height: '48px',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>FY</span>
                            <select
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white', fontWeight: '900', fontSize: '14px',
                                    outline: 'none', cursor: 'pointer'
                                }}
                            >
                                {[2023, 2024, 2025, 2026, 2027].map(y => (
                                    <option key={y} value={y} style={{ background: '#0f172a' }}>
                                        {y}-{String(y + 1).slice(-2)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="glass-card" style={{ padding: '0', display: 'flex', alignItems: 'center', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', height: '48px', background: 'rgba(15, 23, 42, 0.4)' }}>
                            <Search size={18} style={{ margin: '0 15px', color: 'rgba(255,255,255,0.4)' }} />
                            <input type="text" placeholder="Search..." value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'white', height: '100%', outline: 'none', width: '120px', fontSize: '13px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <button onClick={() => setShowAdvanceModal(true)} className="btn-primary" style={{ height: '36px', padding: '0 15px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', border: 'none' }}>
                                <TrendingDown size={14} /> ADVANCE
                            </button>
                            <button onClick={() => { setEditingLoanId(null); setLoanFormData({ driverId: '', totalAmount: '', tenureMonths: '', monthlyEMI: '', remarks: '' }); setShowLoanModal(true); }} className="btn-primary" style={{ height: '36px', padding: '0 15px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: 'none' }}>
                                <Wallet size={14} /> LOAN
                            </button>
                            <button
                                onClick={() => { setEditingAllowanceId(null); setAllowanceFormData({ driverId: '', amount: '', date: todayIST(), remark: '', type: 'Other' }); setShowAllowanceModal(true); }}
                                className="btn-primary"
                                style={{ height: '36px', padding: '0 15px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'none' }}
                            >
                                <Plus size={14} /> PAY
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* SUMMARY CARDS - ACTING AS NAVIGATION */}
            <div className="stats-grid">
                <div
                    onClick={() => setActiveTab('payroll')}
                    className={`glass-card ${activeTab === 'payroll' ? 'active-nav-card' : 'glass-card-hover-effect'}`}
                    style={{
                        flex: '1',
                        minWidth: '240px',
                        maxWidth: '400px',
                        padding: '24px',
                        cursor: 'pointer',
                        background: activeTab === 'payroll'
                            ? 'linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(56,189,248,0.1) 100%)'
                            : 'linear-gradient(135deg, rgba(56,189,248,0.1) 0%, rgba(56,189,248,0.05) 100%)',
                        border: activeTab === 'payroll'
                            ? '2px solid var(--primary)'
                            : '1px solid rgba(56,189,248,0.2)',
                        transition: 'all 0.3s ease',
                        boxShadow: activeTab === 'payroll' ? '0 10px 25px rgba(56,189,248,0.2)' : 'none'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', marginBottom: '8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Monthly Due <CheckCircle size={14} />
                            </p>
                            <h3 style={{ fontSize: '28px', fontWeight: '950', color: 'white', margin: 0 }}>₹ {salaries.reduce((sum, s) => sum + (s.netPayable || 0), 0).toLocaleString()}</h3>
                        </div>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(56,189,248,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <IndianRupee size={20} color="var(--primary)" />
                        </div>
                    </div>
                </div>


                <div
                    onClick={() => setActiveTab('advances')}
                    className={`glass-card ${activeTab === 'advances' ? 'active-nav-card' : 'glass-card-hover-effect'}`}
                    style={{
                        flex: '1',
                        minWidth: '240px',
                        maxWidth: '400px',
                        padding: '24px',
                        cursor: 'pointer',
                        background: activeTab === 'advances'
                            ? 'linear-gradient(135deg, rgba(244,63,94,0.2) 0%, rgba(244,63,94,0.1) 100%)'
                            : 'linear-gradient(135deg, rgba(244,63,94,0.1) 0%, rgba(244,63,94,0.05) 100%)',
                        border: activeTab === 'advances'
                            ? '2px solid #f43f5e'
                            : '1px solid rgba(244,63,94,0.2)',
                        transition: 'all 0.3s ease',
                        boxShadow: activeTab === 'advances' ? '0 10px 25px rgba(244,63,94,0.2)' : 'none'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontSize: '12px', fontWeight: '800', color: '#f43f5e', marginBottom: '8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Monthly Advances {activeTab === 'advances' && <CheckCircle size={14} />}
                            </p>
                            <h3 style={{ fontSize: '28px', fontWeight: '950', color: 'white', margin: 0 }}>₹ {salaries.reduce((sum, s) => sum + (s.totalAdvances || 0), 0).toLocaleString()}</h3>
                        </div>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(244,63,94,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <TrendingDown size={20} color="#f43f5e" />
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => setActiveTab('loans')}
                    className={`glass-card ${activeTab === 'loans' ? 'active-nav-card' : 'glass-card-hover-effect'}`}
                    style={{
                        flex: '1',
                        minWidth: '240px',
                        maxWidth: '400px',
                        padding: '24px',
                        cursor: 'pointer',
                        background: activeTab === 'loans'
                            ? 'linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(251,191,36,0.1) 100%)'
                            : 'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(251,191,36,0.05) 100%)',
                        border: activeTab === 'loans'
                            ? '2px solid var(--primary)'
                            : '1px solid rgba(251,191,36,0.2)',
                        transition: 'all 0.3s ease',
                        boxShadow: activeTab === 'loans' ? '0 10px 25px rgba(251,191,36,0.2)' : 'none'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', marginBottom: '8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Monthly EMI {activeTab === 'loans' && <CheckCircle size={14} />}
                            </p>
                            <h3 style={{ fontSize: '28px', fontWeight: '950', color: 'white', margin: 0 }}>₹ {salaries.reduce((sum, s) => sum + (s.totalEMI || 0), 0).toLocaleString()}</h3>
                        </div>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(251,191,36,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Wallet size={20} color="var(--primary)" />
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => setActiveTab('allowances')}
                    className={`glass-card ${activeTab === 'allowances' ? 'active-nav-card' : 'glass-card-hover-effect'}`}
                    style={{
                        flex: '1',
                        minWidth: '240px',
                        maxWidth: '400px',
                        padding: '24px',
                        cursor: 'pointer',
                        background: activeTab === 'allowances'
                            ? 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.1) 100%)'
                            : 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.05) 100%)',
                        border: activeTab === 'allowances'
                            ? '2px solid #10b981'
                            : '1px solid rgba(16,185,129,0.2)',
                        transition: 'all 0.3s ease',
                        boxShadow: activeTab === 'allowances' ? '0 10px 25px rgba(16,185,129,0.2)' : 'none'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontSize: '12px', fontWeight: '800', color: '#10b981', marginBottom: '8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Special Payments {activeTab === 'allowances' && <CheckCircle size={14} />}
                            </p>
                            <h3 style={{ fontSize: '28px', fontWeight: '950', color: 'white', margin: 0 }}>₹ {salaries.reduce((sum, s) => sum + (s.totalAllowances || 0), 0).toLocaleString()}</h3>
                        </div>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Plus size={20} color="#10b981" />
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'payroll' && (
                    <motion.div key="payroll" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.3 }}>

                        {/* Desktop Table */}
                        <div className="glass-card hide-mobile" style={{ padding: '0', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)', background: 'transparent' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', padding: '0 10px', minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left' }}>
                                        {['Driver', 'Daily Wage', 'Duty Days', 'Nights', 'Earnings', 'Advances', 'EMI', 'Total', 'Reports'].map(h => (
                                            <th key={h} style={{ padding: '15px 20px', color: (h === 'Total' || h === 'Reports') ? '#10b981' : 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {loading ? (
                                            <tr><td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: 'white' }}>Loading report...</td></tr>
                                        ) : filteredSalaries.length === 0 ? (
                                            <tr><td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No records found for this period.</td></tr>
                                        ) : (
                                            filteredSalaries.map((s, idx) => (
                                                <motion.tr key={s.driverId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }} onClick={() => fetchDriverDetails(s.driverId)}
                                                    className="glass-card-hover-effect"
                                                    style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', cursor: 'pointer' }}>
                                                    <td style={{ padding: '20px 25px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                                                        <div style={{ fontWeight: '700', color: 'white' }}>{s.name}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.mobile}</div>
                                                    </td>
                                                    <td style={{ padding: '20px 20px', color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontFamily: 'monospace' }}>₹ {s.dailyWage}</td>
                                                    <td style={{ padding: '20px 20px', color: 'white', fontWeight: '800' }}>{s.workingDays || 0}</td>
                                                    <td style={{ padding: '20px 20px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {s.nightStayCount > 0 && <span style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>{s.nightStayCount} NIGHTS</span>}
                                                            {s.sameDayCount > 0 && <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>{s.sameDayCount} DAY</span>}
                                                            {!(s.nightStayCount > 0 || s.sameDayCount > 0) && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>-</span>}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '20px 20px', color: '#38bdf8', fontWeight: '700' }}>₹ {s.totalEarned - (s.totalAllowances || 0)}</td>
                                                    <td style={{ padding: '20px 20px', color: '#f43f5e', fontWeight: '700' }}>₹ {(s.totalAdvances || 0).toLocaleString()}</td>
                                                    <td style={{ padding: '20px 20px', color: 'var(--primary)', fontWeight: '700' }}>₹ {s.totalEMI}</td>
                                                    <td style={{ padding: '20px 20px', color: '#10b981', fontWeight: '900', fontSize: '15px' }}>₹ {s.netPayable}</td>
                                                    <td style={{ padding: '20px 20px', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleQuickDownload(s.driverId); }}
                                                            className="btn-glass"
                                                            title="Download Salary Slip"
                                                            style={{ padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <Download size={18} color="#10b981" />
                                                        </button>
                                                    </td>
                                                </motion.tr>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View */}
                        <div className="show-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {filteredSalaries.map(s => (
                                <div key={s.driverId} className="glass-card" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => fetchDriverDetails(s.driverId)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                        <div>
                                            <h3 style={{ margin: 0, color: 'white', fontSize: '16px' }}>{s.name}</h3>
                                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '12px' }}>{s.mobile}</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ margin: '0 0 4px', color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
                                                Earnings: ₹{s.totalEarned - (s.totalAllowances || 0)}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                                                <h3 style={{ margin: 0, color: '#10b981', fontSize: '18px' }}>₹ {s.netPayable}</h3>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleQuickDownload(s.driverId); }}
                                                    style={{ background: 'rgba(16,185,129,0.1)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                >
                                                    <Download size={14} color="#10b981" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                                        {[
                                            ['DAILY WAGE', `₹ ${s.dailyWage}`, 'rgba(255,255,255,0.7)'],
                                            ['DUTY DAYS', s.workingDays, 'white'],
                                            ['NIGHTS', s.nightStayCount || 0, 'var(--primary)'],
                                            ['SAME DAY', s.sameDayCount || 0, '#10b981'],
                                            ['EARNINGS', `₹ ${s.totalEarned - (s.totalAllowances || 0)}`, 'white'],
                                            ['ADVANCES', `₹ ${(s.totalAdvances || 0).toLocaleString()}`, '#f43f5e']
                                        ].map(([label, val, color]) => (
                                            <div key={label} style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '10px' }}>{label}</p>
                                                <p style={{ margin: '4px 0 0', color, fontWeight: '700' }}>{val}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                    </motion.div>
                )}

                {activeTab === 'advances' && (
                    <motion.div key="advances" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ marginTop: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                            <div style={{ width: '4px', height: '24px', background: '#f43f5e', borderRadius: '2px' }}></div>
                            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>Advance <span style={{ color: '#f43f5e' }}>Ledger History</span></h2>
                        </div>

                        <div className="glass-card hide-mobile" style={{ padding: '0', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)', background: 'transparent' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', padding: '0 10px', minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left' }}>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Driver</th>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Date</th>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Amount</th>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Remarks</th>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAdvances.length === 0 ? (
                                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '120px 0', background: 'rgba(30, 41, 59, 0.2)', borderRadius: '30px', border: '2px dashed rgba(255,255,255,0.05)' }}>
                                            <IndianRupee size={60} style={{ margin: '0 auto 20px', opacity: 0.1, color: 'var(--primary)' }} />
                                            <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '700', margin: 0 }}>No Advance Records</h3>
                                            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Record a new advance to start tracking.</p>
                                        </td></tr>
                                    ) : filteredAdvances.map((advance, idx) => (
                                        <motion.tr
                                            key={advance._id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="glass-card-hover-effect"
                                            style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '12px' }}
                                        >
                                            <td style={{ padding: '20px 25px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(251, 191, 36, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                                                        {advance.driver?.name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div style={{ color: 'white', fontWeight: '700' }}>{advance.driver?.name}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{advance.driver?.mobile}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '20px 25px' }}>
                                                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                                                    {formatDateIST(advance.date)}
                                                </div>
                                            </td>
                                            <td style={{ padding: '20px 25px' }}>
                                                <div style={{ color: 'white', fontWeight: '800' }}>₹ {advance.amount?.toLocaleString()}</div>
                                            </td>
                                            <td style={{ padding: '20px 25px' }}>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {advance.remark || '-'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '20px 25px', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEditClick(advance); }}
                                                        style={{
                                                            background: 'rgba(56, 189, 248, 0.1)',
                                                            color: '#38bdf8',
                                                            border: 'none',
                                                            padding: '8px',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteAdvance(advance._id); }}
                                                        style={{
                                                            background: 'rgba(244, 63, 94, 0.1)',
                                                            color: '#f43f5e',
                                                            border: 'none',
                                                            padding: '8px',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="show-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {filteredAdvances.map(advance => (
                                <div key={advance._id} className="glass-card" style={{ padding: '16px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(251, 191, 36, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                                                {advance.driver?.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '800', color: 'white' }}>{advance.driver?.name}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDateIST(advance.date)}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: 'var(--primary)', fontWeight: '800' }}>₹{advance.amount}</div>
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', justifyContent: 'flex-end' }}>
                                                <button onClick={() => handleEditClick(advance)} style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '10px' }}>Edit</button>
                                                <button onClick={() => handleDeleteAdvance(advance._id)} style={{ background: 'transparent', border: 'none', color: '#f43f5e', fontSize: '10px' }}>Delete</button>
                                            </div>
                                        </div>
                                    </div>
                                    {advance.remark && <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>"{advance.remark}"</p>}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}


                {activeTab === 'loans' && (
                    <motion.div key="loans" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ marginTop: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                            <div style={{ width: '4px', height: '24px', background: '#818cf8', borderRadius: '2px' }}></div>
                            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>Loan <span style={{ color: '#818cf8' }}>Management Master</span></h2>
                        </div>

                        <div className="glass-card hide-mobile" style={{ padding: '0', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)', background: 'transparent' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', padding: '0 10px', minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left' }}>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Driver</th>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Loan Amount</th>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Monthly EMI</th>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Remaining</th>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Loan Period</th>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLoans.length === 0 ? (
                                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '60px 0', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '20px' }}>
                                            <Wallet size={40} style={{ opacity: 0.1, marginBottom: '10px', color: 'var(--primary)' }} />
                                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No active loans found for this period.</p>
                                        </td></tr>
                                    ) : filteredLoans.map((loan, idx) => (
                                        <motion.tr
                                            key={loan._id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="glass-card-hover-effect"
                                            style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '12px' }}
                                        >
                                            <td style={{ padding: '20px 25px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                                                <div style={{ color: 'white', fontWeight: '700' }}>{loan.driver?.name}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{loan.driver?.mobile}</div>
                                            </td>
                                            <td style={{ padding: '20px 25px' }}>
                                                <div style={{ color: 'white', fontWeight: '800' }}>₹ {loan.totalAmount?.toLocaleString()}</div>
                                            </td>
                                            <td style={{ padding: '20px 25px' }}>
                                                <div style={{ color: 'var(--primary)', fontWeight: '800' }}>₹ {loan.monthlyEMI?.toLocaleString()}</div>
                                            </td>
                                            <td style={{ padding: '20px 25px' }}>
                                                <div style={{ color: '#f43f5e', fontWeight: '800', fontSize: '15px' }}>
                                                    {(() => {
                                                        const sDate = new Date(loan.startDate);
                                                        const sVal = (sDate.getFullYear() * 12) + (sDate.getMonth() + 1);
                                                        const currentMonthNum = Number(month);
                                                        const calendarYear = (currentMonthNum >= 1 && currentMonthNum <= 3) ? year + 1 : year;
                                                        const selVal = (parseInt(calendarYear) * 12) + parseInt(currentMonthNum);
                                                        const mIdx = month === 'All' ? null : (selVal - sVal) + 1;

                                                        if (mIdx === null) return `₹ ${loan.remainingAmount?.toLocaleString()}`;
                                                        const histRem = Math.max(0, loan.totalAmount - (loan.monthlyEMI * mIdx));
                                                        return `₹ ${histRem.toLocaleString()}`;
                                                    })()}
                                                </div>
                                            </td>
                                            <td style={{ padding: '20px 25px' }}>
                                                {(() => {
                                                    const sDate = new Date(loan.startDate);
                                                    const tenure = parseInt(loan.tenureMonths, 10) || (loan.monthlyEMI > 0 ? Math.round(loan.totalAmount / loan.monthlyEMI) : 1);
                                                    const eDate = new Date(sDate.getFullYear(), sDate.getMonth() + tenure - 1, 1);
                                                    const startLabel = formatDateIST(loan.startDate);
                                                    const endLabel = eDate.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            <div style={{ color: 'white', fontSize: '12px', fontWeight: '700' }}>
                                                                <span style={{ color: 'var(--text-muted)', fontSize: '9px', marginRight: '4px' }}>START:</span> {startLabel}
                                                            </div>
                                                            <div style={{ color: '#818cf8', fontSize: '12px', fontWeight: '800' }}>
                                                                <span style={{ color: 'var(--text-muted)', fontSize: '9px', marginRight: '4px' }}>CLOSE:</span> {endLabel.toUpperCase()}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td style={{ padding: '20px 25px' }}>
                                                <span style={{
                                                    padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800',
                                                    background: loan.status === 'Active' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                                                    color: loan.status === 'Active' ? '#10b981' : '#f43f5e'
                                                }}>
                                                    {loan.status?.toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={{ padding: '20px 25px', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button onClick={() => handleEditLoan(loan)} style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeleteLoan(loan._id)} style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="show-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {filteredLoans.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                                    <p>No active loans found.</p>
                                </div>
                            ) : filteredLoans.map(loan => (
                                <div key={loan._id} className="glass-card" style={{ padding: '20px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                        <div>
                                            <div style={{ fontWeight: '800', color: 'white', fontSize: '16px' }}>{loan.driver?.name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{loan.driver?.mobile}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{
                                                padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '900',
                                                background: loan.status === 'Active' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                                                color: loan.status === 'Active' ? '#10b981' : '#f43f5e'
                                            }}>
                                                {loan.status?.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '10px' }}>
                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Loan Amount</div>
                                            <div style={{ color: 'white', fontWeight: '800', fontSize: '15px' }}>₹{loan.totalAmount?.toLocaleString()}</div>
                                        </div>
                                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '10px' }}>
                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Monthly EMI</div>
                                            <div style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '15px' }}>₹{loan.monthlyEMI?.toLocaleString()}</div>
                                        </div>
                                        <div style={{ background: 'rgba(244, 63, 94, 0.05)', padding: '10px', borderRadius: '10px', gridColumn: 'span 2', border: '1px solid rgba(244, 63, 94, 0.1)' }}>
                                            <div style={{ fontSize: '10px', color: '#f43f5e', textTransform: 'uppercase', fontWeight: '800' }}>Remaining Balance</div>
                                            <div style={{ color: '#f43f5e', fontWeight: '900', fontSize: '18px' }}>
                                                {(() => {
                                                    const sDate = new Date(loan.startDate);
                                                    const sVal = (sDate.getFullYear() * 12) + (sDate.getMonth() + 1);
                                                    const currentMonthNum = Number(month);
                                                    const calendarYear = (currentMonthNum >= 1 && currentMonthNum <= 3) ? year + 1 : year;
                                                    const selVal = (parseInt(calendarYear) * 12) + parseInt(currentMonthNum);
                                                    const mIdx = month === 'All' ? null : (selVal - sVal) + 1;

                                                    if (mIdx === null) return `₹ ${loan.remainingAmount?.toLocaleString()}`;
                                                    const histRem = Math.max(0, loan.totalAmount - (loan.monthlyEMI * mIdx));
                                                    return `₹ ${histRem.toLocaleString()}`;
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            Period: <span style={{ color: 'white', fontWeight: '700' }}>{formatDateIST(loan.startDate)}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button onClick={() => handleEditLoan(loan)} style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: 'none', padding: '8px', borderRadius: '8px' }}><Edit2 size={16} /></button>
                                            <button onClick={() => handleDeleteLoan(loan._id)} style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: 'none', padding: '8px', borderRadius: '8px' }}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'allowances' && (
                    <motion.div key="allowances" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ marginTop: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <Plus size={22} color="#10b981" />
                            </div>
                            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>Special Payments <span style={{ color: '#10b981' }}>(Allowances)</span></h2>
                        </div>

                        <div className="glass-card" style={{ padding: '0', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)', background: 'transparent' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', padding: '0 10px', minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left' }}>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Driver</th>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Date</th>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Type</th>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Amount</th>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Remarks</th>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAllowances.length === 0 ? (
                                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>No special payments found.</td></tr>
                                    ) : (
                                        filteredAllowances.map((al, idx) => (
                                            <motion.tr key={al._id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                                                style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px' }}>
                                                <td style={{ padding: '15px 25px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                                                    <div style={{ fontWeight: '700', color: 'white' }}>{al.driver?.name}</div>
                                                </td>
                                                <td style={{ padding: '15px 25px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>{formatDateIST(al.date)}</td>
                                                <td style={{ padding: '15px 25px' }}>
                                                    <span style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: '800' }}>{al.type?.toUpperCase()}</span>
                                                </td>
                                                <td style={{ padding: '15px 25px', color: '#10b981', fontWeight: '900', fontSize: '15px' }}>₹ {(al.amount || 0).toLocaleString()}</td>
                                                <td style={{ padding: '15px 25px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{al.remark || '-'}</td>
                                                <td style={{ padding: '15px 25px', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        <button onClick={() => handleEditAllowance(al)} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer' }}><Edit2 size={14} /></button>
                                                        <button onClick={() => handleDeleteAllowance(al._id)} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(244,63,94,0.1)', border: 'none', color: '#f43f5e', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="show-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {filteredAllowances.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                                    <p>No special payments found.</p>
                                </div>
                            ) : filteredAllowances.map(al => (
                                <div key={al._id} className="glass-card" style={{ padding: '16px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <div style={{ fontWeight: '800', color: 'white' }}>{al.driver?.name}</div>
                                        <div style={{ color: '#10b981', fontWeight: '900' }}>₹{al.amount?.toLocaleString()}</div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDateIST(al.date)}</div>
                                        <span style={{ fontSize: '9px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: '800' }}>{al.type?.toUpperCase()}</span>
                                    </div>
                                    {al.remark && <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>"{al.remark}"</p>}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                        <button onClick={() => handleEditAllowance(al)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '11px' }}>EDIT</button>
                                        <button onClick={() => handleDeleteAllowance(al._id)} style={{ background: 'rgba(244,63,94,0.1)', border: 'none', color: '#f43f5e', padding: '6px 12px', borderRadius: '6px', fontSize: '11px' }}>DELETE</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* RECORD ADVANCE MODAL */}
            <AnimatePresence>
                {showAdvanceModal && (
                    <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1100 }}>
                        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                            className="modal-container" style={{ width: '100%', maxWidth: '480px', padding: '30px' }}>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                                <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '900', margin: 0 }}>{editingAdvanceId ? 'Edit Advance' : 'Record Advance'}</h2>
                                <button onClick={() => { setShowAdvanceModal(false); setEditingAdvanceId(null); }} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                            </div>

                            <form onSubmit={handleAddAdvance} style={{ display: 'grid', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Select Driver</label>
                                    <select
                                        className="input-field"
                                        required
                                        value={advanceFormData.driverId}
                                        onChange={(e) => setAdvanceFormData({ ...advanceFormData, driverId: e.target.value })}
                                        style={{ width: '100%', height: '50px', background: '#1e293b', color: 'white' }}
                                    >
                                        <option value="" style={{ background: '#1e293b', color: 'white' }}>Choose a driver...</option>
                                        {drivers.map(d => (
                                            <option key={d._id} value={d._id} style={{ background: '#1e293b', color: 'white' }}>
                                                {d.name} ({d.mobile})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="modal-form-grid" style={{ marginBottom: '0' }}>
                                    <div>
                                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Amount</label>
                                        <input type="number" className="input-field" required value={advanceFormData.amount} onChange={(e) => setAdvanceFormData({ ...advanceFormData, amount: e.target.value })} style={{ width: '100%', height: '50px', background: '#1e293b', color: 'white', borderRadius: '12px', padding: '0 15px', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="₹ 0" />
                                    </div>
                                    <div>
                                        <PremiumDateInput
                                            label="Date"
                                            required
                                            value={advanceFormData.date}
                                            onChange={(v) => setAdvanceFormData({ ...advanceFormData, date: v })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Remark</label>
                                    <textarea className="input-field" value={advanceFormData.remark} onChange={(e) => setAdvanceFormData({ ...advanceFormData, remark: e.target.value })} style={{ width: '100%', padding: '15px' }} rows="2" placeholder="Ex: Fuel advance, Family need..." />
                                </div>

                                {advanceMessage.text && (
                                    <div style={{ padding: '12px', borderRadius: '10px', background: advanceMessage.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', color: advanceMessage.type === 'success' ? '#10b981' : '#f43f5e', border: `1px solid ${advanceMessage.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`, fontSize: '13px', fontWeight: '700' }}>
                                        {advanceMessage.text}
                                    </div>
                                )}

                                <button type="submit" disabled={submittingAdvance} className="btn-primary" style={{ height: '50px', fontWeight: '900', fontSize: '15px' }}>
                                    {submittingAdvance ? 'PROCESSING...' : (editingAdvanceId ? 'UPDATE ADVANCE' : 'CONFIRM ADVANCE')}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* RECORD ADDITIONAL PAYMENT (ALLOWANCE) MODAL */}
            <AnimatePresence>
                {showAllowanceModal && (
                    <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1100, position: 'fixed', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                            className="modal-container" style={{ width: '100%', maxWidth: '480px', padding: '30px', background: '#0f172a', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                                <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '900', margin: 0 }}>{editingAllowanceId ? 'Edit Payment' : 'Record Special Payment'}</h2>
                                <button onClick={() => { setShowAllowanceModal(false); setEditingAllowanceId(null); }} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                            </div>

                            <form onSubmit={handleAddAllowance} style={{ display: 'grid', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Select Driver</label>
                                    <select
                                        className="input-field"
                                        required
                                        value={allowanceFormData.driverId}
                                        onChange={(e) => setAllowanceFormData({ ...allowanceFormData, driverId: e.target.value })}
                                        style={{ width: '100%', height: '50px', background: '#1e293b', color: 'white', borderRadius: '12px', padding: '0 15px', border: '1px solid rgba(255,255,255,0.1)' }}
                                    >
                                        <option value="" style={{ background: '#1e293b', color: 'white' }}>Choose a driver...</option>
                                        {drivers.map(d => (
                                            <option key={d._id} value={d._id} style={{ background: '#1e293b', color: 'white' }}>
                                                {d.name} ({d.mobile})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="modal-form-grid" style={{ marginBottom: '0' }}>
                                    <div>
                                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Amount</label>
                                        <input type="number" className="input-field" required value={allowanceFormData.amount} onChange={(e) => setAllowanceFormData({ ...allowanceFormData, amount: e.target.value })} style={{ width: '100%', height: '50px', background: '#1e293b', color: 'white', borderRadius: '12px', padding: '0 15px', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="₹ 0" />
                                    </div>
                                    <div>
                                        <PremiumDateInput
                                            label="Date"
                                            required
                                            value={allowanceFormData.date}
                                            onChange={(v) => setAllowanceFormData({ ...allowanceFormData, date: v })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Payment Type</label>
                                    <select
                                        className="input-field"
                                        value={allowanceFormData.type}
                                        onChange={(e) => setAllowanceFormData({ ...allowanceFormData, type: e.target.value })}
                                        style={{ width: '100%', height: '50px', background: '#1e293b', color: 'white', borderRadius: '12px', padding: '0 15px', border: '1px solid rgba(255,255,255,0.1)' }}
                                    >
                                        <option value="Bonus">Bonus</option>
                                        <option value="Wedding">Wedding</option>
                                        <option value="Office Work">Office Work</option>
                                        <option value="Repair Help">Repair Help</option>
                                        <option value="Other">Other Adjustment</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Remark</label>
                                    <textarea className="input-field" value={allowanceFormData.remark} onChange={(e) => setAllowanceFormData({ ...allowanceFormData, remark: e.target.value })} style={{ width: '100%', padding: '15px', background: '#1e293b', color: 'white', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} rows="2" placeholder="Ex: Special work bonus..." />
                                </div>

                                {allowanceMessage.text && (
                                    <div style={{ padding: '12px', borderRadius: '10px', background: allowanceMessage.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', color: allowanceMessage.type === 'success' ? '#10b981' : '#f43f5e', border: `1px solid ${allowanceMessage.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`, fontSize: '13px', fontWeight: '700' }}>
                                        {allowanceMessage.text}
                                    </div>
                                )}

                                <button type="submit" disabled={submittingAllowance} className="btn-primary" style={{ height: '50px', fontWeight: '900', fontSize: '15px', background: '#10b981', border: 'none', borderRadius: '12px', color: 'white' }}>
                                    {submittingAllowance ? 'PROCESSING...' : (editingAllowanceId ? 'UPDATE PAYMENT' : 'CONFIRM PAYMENT')}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>


            {/* DETAIL MODAL */}
            <AnimatePresence>
                {showDetailModal && (
                    <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }} className="modal-container"
                            style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>

                            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, rgba(255,255,255,0.02), transparent)', position: 'sticky', top: 0, backdropFilter: 'blur(10px)', zIndex: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div>
                                        <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '800', margin: 0 }}>Salary Breakdown {selectedDriverDetails?.vID && <span style={{ fontSize: '10px', color: 'var(--primary)' }}>({selectedDriverDetails.vID})</span>}</h2>
                                        {driverName && <p style={{ color: 'var(--primary)', fontSize: '13px', margin: '4px 0 0', fontWeight: '600' }}>{driverName}</p>}
                                    </div>
                                    {selectedDriverDetails && !detailLoading && (
                                        <button
                                            onClick={() => handleExportPDF(selectedDriverDetails)}
                                            className="btn-primary"
                                            style={{ padding: '8px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}
                                        >
                                            <Download size={16} /> DOWNLOAD PDF
                                        </button>
                                    )}
                                </div>
                                <button onClick={() => setShowDetailModal(false)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer', border: 'none' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ padding: '20px' }}>
                                {detailLoading ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'white' }}>Loading details...</div>
                                ) : (
                                    <>
                                        {/* ─── SUMMARY CARDS ─── */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '28px' }}>
                                            {/* GROSS PAYROLL SUBTOTAL CARD */}
                                            <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(30,41,59,0.5))', border: '2px solid #10b981', borderRadius: '12px', padding: '14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                    <TrendingDown size={14} color="#10b981" style={{ transform: 'rotate(180deg)' }} />
                                                    <span style={{ fontSize: '10px', color: '#10b981', fontWeight: '900', textTransform: 'uppercase' }}>Gross Payroll</span>
                                                </div>
                                                <div style={{ color: 'white', fontWeight: '900', fontSize: '22px' }}>₹{grossPayroll.toLocaleString()}</div>
                                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '2px', fontWeight: '700' }}>TOTAL EARNINGS (MATCHED)</div>
                                            </div>
                                            <div style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: '12px', padding: '14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                    <Car size={14} color="#38bdf8" />
                                                    <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '800', textTransform: 'uppercase' }}>Routine Earnings</span>
                                                </div>
                                                <div style={{ color: 'white', fontWeight: '900', fontSize: '20px' }}>₹{routineEarningsTotal.toLocaleString()}</div>
                                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                    Wages: ₹{calcWages.toLocaleString()}
                                                    {showSDR && ` + SDR: ₹${calcSDR.toLocaleString()}`}
                                                    {showNight && ` + Night: ₹${calcNight.toLocaleString()}`}
                                                    {calcOT > 0 && ` + OT: ₹${calcOT.toLocaleString()}`}
                                                    {(calcSpecialPay > 0 || calcOtherBonuses > 0) && ` + Extra: ₹${(calcSpecialPay + calcOtherBonuses).toLocaleString()}`}
                                                </div>
                                            </div>

                                            {/* Parking Reimbursements */}
                                            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                    <ParkingSquare size={14} color="var(--primary)" />
                                                    <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '800', textTransform: 'uppercase' }}>Parking</span>
                                                </div>
                                                <div style={{ color: 'white', fontWeight: '900', fontSize: '20px' }}>₹{calcParking.toLocaleString()}</div>
                                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Total Parking/Toll</div>
                                            </div>

                                            {/* Special Allowances Card */}
                                            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                    <Plus size={14} color="#10b981" />
                                                    <span style={{ fontSize: '10px', color: '#10b981', fontWeight: '800', textTransform: 'uppercase' }}>Special Pay</span>
                                                </div>
                                                <div style={{ color: 'white', fontWeight: '900', fontSize: '20px' }}>₹{(summary.totalAllowances || 0).toLocaleString()}</div>
                                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Office Work / Other Adjustments</div>
                                            </div>



                                            {/* Advances Card */}
                                            <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: '12px', padding: '14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                    <TrendingDown size={14} color="#f43f5e" />
                                                    <span style={{ fontSize: '10px', color: '#f43f5e', fontWeight: '800', textTransform: 'uppercase' }}>Advances</span>
                                                </div>
                                                <div style={{ color: 'white', fontWeight: '900', fontSize: '20px' }}>₹{totalAdvances.toLocaleString()}</div>
                                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{det?.advances?.length || 0} taken</div>
                                            </div>

                                            {/* EMI Deduction Card */}
                                            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                    <Wallet size={14} color="#818cf8" />
                                                    <span style={{ fontSize: '10px', color: '#818cf8', fontWeight: '800', textTransform: 'uppercase' }}>EMI Deduction</span>
                                                </div>
                                                <div style={{ color: 'white', fontWeight: '900', fontSize: '20px' }}>₹{totalEMI.toLocaleString()}</div>
                                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Loan Repayment</div>
                                            </div>


                                        </div>

                                        {/* NET PAYABLE BANNER */}
                                        <div style={{ background: netPayable >= 0 ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))' : 'linear-gradient(135deg, rgba(244,63,94,0.15), rgba(244,63,94,0.05))', border: `1px solid ${netPayable >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`, borderRadius: '12px', padding: '16px 20px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '11px', fontWeight: '800', color: netPayable >= 0 ? '#10b981' : '#f43f5e', textTransform: 'uppercase', marginBottom: '4px' }}>Net Payout This Month</div>
                                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>₹{grossPayroll.toLocaleString()} Total Earnings − ₹{(totalAdvances + totalEMI).toLocaleString()} Total Deductions</div>
                                            </div>
                                            <div style={{ color: netPayable >= 0 ? '#10b981' : '#f43f5e', fontWeight: '900', fontSize: '26px' }}>₹{Math.abs(netPayable).toLocaleString()}</div>
                                        </div>

                                        {/* ─── DUTY BREAKDOWN TABLE ─── */}
                                        <h3 style={{ fontSize: '14px', color: 'white', marginBottom: '15px', borderLeft: '3px solid var(--primary)', paddingLeft: '10px' }}>Duty Calendar (Earnings)</h3>
                                        <div style={{ overflowX: 'auto', marginBottom: '30px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                <thead>
                                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)' }}>Date</th>
                                                        <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)' }}>WAGES</th>
                                                        {showSDR && <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)' }}>SDR</th>}
                                                        {showNight && <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)' }}>Night</th>}
                                                        <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)' }}>Parking</th>
                                                        <th style={{ padding: '12px', textAlign: 'right', color: 'white' }}>Day Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {det?.breakdown?.map((day, idx) => (
                                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                            <td style={{ padding: '12px', color: 'white' }}>
                                                                {formatDateIST(day.date)}
                                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{day.type || 'Duty'}</div>
                                                                {day.remarks && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{day.remarks}</div>}
                                                            </td>
                                                            <td style={{ padding: '12px', textAlign: 'right', color: 'rgba(255,255,255,0.7)' }}>₹{day.wage || 0}</td>
                                                            {showSDR && <td style={{ padding: '12px', textAlign: 'right', color: '#38bdf8', fontWeight: '600' }}>₹{day.sameDayReturn || 0}</td>}
                                                            {showNight && <td style={{ padding: '12px', textAlign: 'right', color: '#10b981', fontWeight: '600' }}>₹{day.nightStay || 0}</td>}
                                                            <td style={{ padding: '12px', textAlign: 'right', color: 'var(--primary)', fontWeight: '800' }}>₹{day.parking || 0}</td>
                                                            <td style={{ padding: '12px', textAlign: 'right', color: '#10b981', fontWeight: '700' }}>₹{(day.total || 0).toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                    {/* Standalone Parking Entries */}
                                                    {det?.parkingEntries?.filter(p => {
                                                        const pDateStr = toISTDateString(p.date);
                                                        return !det?.breakdown?.some(d => d.date === pDateStr);
                                                    }).map((p, idx) => (
                                                        <tr key={`p-${idx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(245,158,11,0.02)' }}>
                                                            <td style={{ padding: '12px', color: 'white' }}>
                                                                {formatDateIST(p.date)}
                                                                <div style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '800' }}>STANDALONE PARKING</div>
                                                                {p.remark && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{p.remark}</div>}
                                                            </td>
                                                            <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)' }}>-</td>
                                                            {showSDR && <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)' }}>-</td>}
                                                            {showNight && <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)' }}>-</td>}
                                                            <td style={{ padding: '12px', textAlign: 'right', color: 'var(--primary)', fontWeight: '800' }}>₹{p.amount || 0}</td>
                                                            <td style={{ padding: '12px', textAlign: 'right', color: '#10b981', fontWeight: '700' }}>₹{(p.amount || 0).toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                    {det?.breakdown?.length === 0 && (
                                                        <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No completed duties found this month.</td></tr>
                                                    )}
                                                    {/* Column Totals Row */}
                                                    {breakdown.length > 0 && (
                                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                            <td style={{ padding: '12px', fontWeight: '800', color: 'white' }}>COLUMN TOTALS</td>
                                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '800', color: 'rgba(255,255,255,0.7)' }}>₹{calcWages.toLocaleString()}</td>
                                                            {showSDR && <td style={{ padding: '12px', textAlign: 'right', fontWeight: '800', color: '#38bdf8' }}>₹{calcSDR.toLocaleString()}</td>}
                                                            {showNight && <td style={{ padding: '12px', textAlign: 'right', fontWeight: '800', color: '#10b981' }}>₹{calcNight.toLocaleString()}</td>}
                                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '800', color: 'var(--primary)' }}>₹{calcParking.toLocaleString()}</td>
                                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '900', color: '#10b981' }}>₹{(routineEarningsTotal + calcParking).toLocaleString()}</td>
                                                        </tr>
                                                    )}
                                                    {/* Wages Subtotal row */}
                                                    {breakdown.length > 0 && (
                                                        <tr style={{ background: 'rgba(16,185,129,0.05)', borderTop: '2px solid rgba(16,185,129,0.15)' }}>
                                                            <td colSpan="5" style={{ padding: '15px 12px', color: '#10b981', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase' }}>Grand Total (Exact Match w/ Summary)</td>
                                                            <td style={{ padding: '15px 12px', textAlign: 'right', color: '#10b981', fontWeight: '900', fontSize: '15px' }}>₹{grossPayroll.toLocaleString()}</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* ─── ALLOWANCES TABLE ─── */}
                                        <h3 style={{ fontSize: '14px', color: 'white', marginBottom: '15px', borderLeft: '3px solid #10b981', paddingLeft: '10px' }}>Special Payments (This Month)</h3>
                                        <div style={{ overflowX: 'auto', marginBottom: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                <thead>
                                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)' }}>Date</th>
                                                        <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)' }}>Type</th>
                                                        <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)' }}>Remark</th>
                                                        <th style={{ padding: '12px', textAlign: 'right', color: 'white' }}>Amount</th>
                                                        <th style={{ padding: '12px', textAlign: 'center', color: 'white' }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {det?.allowances?.map((al, idx) => (
                                                        <tr key={al._id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                            <td style={{ padding: '12px', color: 'white' }}>{formatDateIST(al.date)}</td>
                                                            <td style={{ padding: '12px' }}>
                                                                <span style={{ fontSize: '10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>{al.type?.toUpperCase()}</span>
                                                            </td>
                                                            <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{al.remark}</td>
                                                            <td style={{ padding: '12px', textAlign: 'right', color: '#10b981', fontWeight: '700' }}>₹{al.amount}</td>
                                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                                    <button onClick={() => { setShowDetailModal(false); handleEditAllowance(al); }} style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer' }}><Edit2 size={13} /></button>
                                                                    <button onClick={() => { if (window.confirm('Delete this payout?')) handleDeleteAllowance(al._id); }} style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer' }}><X size={14} /></button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(!det?.allowances || det?.allowances?.length === 0) && (
                                                        <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No special payments found.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* ─── ADVANCES TABLE ─── */}
                                        <h3 style={{ fontSize: '14px', color: 'white', marginBottom: '15px', borderLeft: '3px solid #f43f5e', paddingLeft: '10px' }}>Advances Taken (This Month)</h3>
                                        <div style={{ overflowX: 'auto', marginBottom: '30px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                <thead>
                                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)' }}>Date</th>
                                                        <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)' }}>Reason</th>
                                                        <th style={{ padding: '12px', textAlign: 'right', color: 'white' }}>Amount</th>
                                                        <th style={{ padding: '12px', textAlign: 'center', color: 'white' }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {det?.advances?.map((adv, idx) => (
                                                        <tr key={adv._id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                            <td style={{ padding: '12px', color: 'white' }}>{formatDateIST(adv.date)}</td>
                                                            <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{adv.remark}</td>
                                                            <td style={{ padding: '12px', textAlign: 'right', color: '#f43f5e', fontWeight: '700' }}>₹{adv.amount}</td>
                                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                                    <button onClick={() => { setShowDetailModal(false); handleEditClick(adv); }} style={{ background: 'transparent', border: 'none', color: '#38bdf8', padding: '4px', cursor: 'pointer' }} title="Edit"><Edit2 size={13} /></button>
                                                                    <button onClick={() => handleDeleteAdvance(adv._id)} style={{ background: 'transparent', border: 'none', color: '#f43f5e', padding: '4px', cursor: 'pointer' }} title="Delete"><X size={14} /></button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(!det?.advances || det?.advances?.length === 0) && (
                                                        <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No advances taken this month.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* ─── LOAN & EMI REPAYMENT TABLE (LEDGER) ─── */}
                                        <h3 style={{ fontSize: '14px', color: 'white', marginBottom: '15px', borderLeft: '3px solid #818cf8', paddingLeft: '10px' }}>Loan Ledger (Active Repayments)</h3>
                                        <div style={{ overflowX: 'auto', marginBottom: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                <thead>
                                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)' }}>Loan Start</th>
                                                        <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)' }}>Total Loan</th>
                                                        <th style={{ padding: '12px', textAlign: 'right', color: 'white' }}>Monthly EMI</th>
                                                        <th style={{ padding: '12px', textAlign: 'right', color: '#818cf8' }}>Remaining</th>
                                                        <th style={{ padding: '12px', textAlign: 'center', color: 'white' }}>Progress</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {det?.loans?.map((loan, idx) => {
                                                        const sDate = new Date(loan.startDate);
                                                        const sVal = (sDate.getFullYear() * 12) + (sDate.getMonth() + 1);
                                                        const selVal = (parseInt(year) * 12) + parseInt(month);
                                                        const monthIdx = (selVal - sVal) + 1;
                                                        const tenure = parseInt(loan.tenureMonths, 10) || (loan.monthlyEMI > 0 ? Math.round(loan.totalAmount / loan.monthlyEMI) : 1);

                                                        return (
                                                            <tr key={loan._id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                <td style={{ padding: '12px', color: 'white' }}>{formatDateIST(loan.startDate)}</td>
                                                                <td style={{ padding: '12px', textAlign: 'right', color: 'rgba(255,255,255,0.6)' }}>₹{loan.totalAmount?.toLocaleString()}</td>
                                                                <td style={{ padding: '12px', textAlign: 'right', color: 'white', fontWeight: '700' }}>₹{loan.monthlyEMI?.toLocaleString()}</td>
                                                                <td style={{ padding: '12px', textAlign: 'right', color: '#f43f5e', fontWeight: '800' }}>
                                                                    {(() => {
                                                                        const calendarYear = (month >= 1 && month <= 3) ? year + 1 : year;
                                                                        const selVal = (parseInt(calendarYear) * 12) + parseInt(month);
                                                                        const mIdx = (selVal - sVal) + 1;
                                                                        const histRem = Math.max(0, loan.totalAmount - (loan.monthlyEMI * mIdx));
                                                                        return `₹ ${histRem.toLocaleString()}`;
                                                                    })()}
                                                                </td>
                                                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                                                    <span style={{ fontSize: '10px', background: 'rgba(129, 140, 248, 0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: '4px', fontWeight: '900' }}>
                                                                        {loan.status === 'Completed' ? 'DONE' : `MONTH ${monthIdx}/${tenure}`}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {(!det?.loans || det?.loans?.length === 0) && (
                                                        <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No loan records found for this driver.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* LOAN MODAL */}
            <AnimatePresence>
                {showLoanModal && (
                    <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 11000, position: 'fixed', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                            className="modal-container" style={{ width: '100%', maxWidth: '480px', padding: '30px', background: '#0f172a', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                                <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '900', margin: 0 }}>{editingLoanId ? 'Update Driver Loan' : 'Add Driver Loan'}</h2>
                                <button onClick={() => setShowLoanModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                            </div>

                            <form onSubmit={handleRecordLoan} style={{ display: 'grid', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Select Driver</label>
                                    <select
                                        className="input-field"
                                        required
                                        disabled={editingLoanId}
                                        value={loanFormData.driverId}
                                        onChange={(e) => setLoanFormData({ ...loanFormData, driverId: e.target.value })}
                                        style={{ width: '100%', height: '50px', background: '#1e293b', color: 'white', borderRadius: '12px', padding: '0 15px', border: '1px solid rgba(255,255,255,0.1)', opacity: editingLoanId ? 0.6 : 1 }}
                                    >
                                        <option value="" style={{ background: '#1e293b', color: 'white' }}>Choose a driver...</option>
                                        {drivers.map(d => (
                                            <option key={d._id} value={d._id} style={{ background: '#1e293b', color: 'white' }}>
                                                {d.name} ({d.mobile})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="modal-form-grid" style={{ marginBottom: '0' }}>
                                    <div>
                                        <PremiumDateInput
                                            label="Loan Date"
                                            required
                                            value={loanFormData.startDate}
                                            onChange={(v) => setLoanFormData({ ...loanFormData, startDate: v })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Total Loan</label>
                                        <input type="number" className="input-field" required value={loanFormData.totalAmount} onChange={(e) => setLoanFormData({ ...loanFormData, totalAmount: e.target.value })} style={{ width: '100%', height: '50px', background: '#1e293b', color: 'white', borderRadius: '12px', padding: '0 15px', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="₹ 0" />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Months</label>
                                        <input type="number" className="input-field" required value={loanFormData.tenureMonths} onChange={(e) => setLoanFormData({ ...loanFormData, tenureMonths: e.target.value })} style={{ width: '100%', height: '50px', background: '#1e293b', color: 'white', borderRadius: '12px', padding: '0 15px', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="E.g. 12" />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>EMI</label>
                                        <input type="number" className="input-field" readOnly value={loanFormData.monthlyEMI} style={{ width: '100%', height: '50px', background: 'rgba(255,255,255,0.05)', color: 'var(--primary)', borderRadius: '12px', padding: '0 15px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'not-allowed', fontWeight: '800' }} placeholder="₹ 0" />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Remarks</label>
                                    <textarea className="input-field" value={loanFormData.remarks} onChange={(e) => setLoanFormData({ ...loanFormData, remarks: e.target.value })} style={{ width: '100%', padding: '15px', background: '#1e293b', color: 'white', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} rows="2" placeholder="Loan purpose..." />
                                </div>

                                <button type="submit" disabled={submittingLoan} className="btn-primary" style={{ height: '50px', fontWeight: '900', fontSize: '15px', background: 'var(--primary)', border: 'none', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}>
                                    {submittingLoan ? 'SAVING...' : (editingLoanId ? 'UPDATE LOAN' : 'RECORD LOAN')}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DriverSalaries;

