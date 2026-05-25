import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../api/axios';
import { Plus, Search, Trash2, Car, X, Save, ChevronLeft, ChevronRight, Calendar, Edit, MapPin, Briefcase, Layers, ShoppingCart, TrendingUp, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import SEO from '../components/SEO';
import PremiumDateInput from '../components/common/PremiumDateInput';
import { todayIST, toISTDateString, firstDayOfMonthIST, formatDateIST, nowIST } from '../utils/istUtils';

const OutsideCars = () => {
    const { theme } = useTheme();
    const { selectedCompany } = useCompany();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12 or 'All'
    const [selectedYear, setSelectedYear] = useState(new Date().getMonth() < 3 ? new Date().getFullYear() - 1 : new Date().getFullYear());
    const [selectedDay, setSelectedDay] = useState('All'); 
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [ownerFilter, setOwnerFilter] = useState('All');
    const [propertyFilter, setPropertyFilter] = useState('All');
    const [transactionFilter, setTransactionFilter] = useState('Buy');
    const [viewMode, setViewMode] = useState('monthly'); 
    const location = useLocation();

    // ── AI AGENT SEARCH INTEGRATION ──
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchParam = params.get('search') || params.get('name') || params.get('vendor') || params.get('owner');
        const monthParam = params.get('month');
        const yearParam = params.get('year');
        const dayParam = params.get('day');

        if (searchParam) setSearchTerm(searchParam);
        if (monthParam) setSelectedMonth(Number(monthParam)); // Match 1-indexed state
        if (yearParam) setSelectedYear(Number(yearParam));
        if (dayParam) setSelectedDay(dayParam);
    }, [location.search]);

    useEffect(() => {
        setSearchTerm('');
        setShowModal(false);
        setEditMode(false);
        const now = new Date();
        setSelectedMonth(now.getMonth() + 1);
        setSelectedYear(now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear());
        setSelectedDay('All');
        setFormData({
            carNumber: '',
            model: '',
            property: '',
            dutyType: '',
            ownerName: '',
            dutyAmount: '',
            dropLocation: '',
            transactionType: 'Buy',
            date: ''
        });
    }, [location.pathname, location.key]);

    useEffect(() => {
        if (viewMode === 'monthly') {
            if (selectedMonth === 'All') {
                const start = `${selectedYear}-04-01`;
                const end = `${selectedYear + 1}-03-31`;
                setFromDate(start);
                setToDate(end);
            } else {
                const calendarYear = (selectedMonth >= 1 && selectedMonth <= 3) ? selectedYear + 1 : selectedYear;
                if (selectedDay === 'All') {
                    const start = toISTDateString(new Date(calendarYear, selectedMonth - 1, 1));
                    const end = toISTDateString(new Date(calendarYear, selectedMonth, 0));
                    setFromDate(start);
                    setToDate(end);
                } else {
                    const d = toISTDateString(new Date(calendarYear, selectedMonth - 1, parseInt(selectedDay)));
                    setFromDate(d);
                    setToDate(d);
                }
            }
        }
    }, [selectedMonth, selectedYear, selectedDay, viewMode]);

    // Modal & Editing State
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [propSuggestions, setPropSuggestions] = useState([]);
    const [showPropSuggestions, setShowPropSuggestions] = useState(false);
    const [catSuggestions, setCatSuggestions] = useState([]);
    const [showCatSuggestions, setShowCatSuggestions] = useState(false);
    const [formData, setFormData] = useState({
        carNumber: '',
        model: '',
        property: '',
        dutyType: '',
        ownerName: '',
        dutyAmount: '',
        dropLocation: '',
        transactionType: 'Buy',
        date: ''
    });

    useEffect(() => {
        if (selectedCompany) {
            fetchOutsideVehicles();
        }
    }, [selectedCompany]);

    const fetchOutsideVehicles = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=outside`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setVehicles(data.vehicles?.filter(v => v.isOutsideCar && !v.eventId) || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
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

    const handleExportPDF = async () => {
        try {
            if (filtered.length === 0) {
                alert("No data available to export.");
                return;
            }

            // Load assets
            const logo = await loadImage(selectedCompany?.logoUrl || '/logos/logo.png').catch(() => null);
            const signature = await loadImage(selectedCompany?.ownerSignatureUrl || '/logos/signature.png').catch(() => null);

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // 1. HEADER
            doc.setFillColor(15, 23, 42); // Navy Dark
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
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text((selectedCompany?.name || 'FLEET MANAGEMENT').toUpperCase(), 52, 22);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(200, 200, 200);
            doc.text('Premium Fleet Management & Travel Solutions', 52, 30);
            doc.setTextColor(14, 165, 233);
            doc.text(selectedCompany?.website || '', 52, 37);

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('OUTSIDE FLEET REPORT', pageWidth - 15, 22, { align: 'right' });
            doc.setFontSize(9);
            doc.text(`PERIOD: ${fromDate} TO ${toDate}`, pageWidth - 15, 30, { align: 'right' });

            // 2. SUMMARY STATS
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('REPORT SUMMARY', 15, 65);
            doc.setDrawColor(14, 165, 233);
            doc.setLineWidth(0.5);
            doc.line(15, 68, 50, 68);

            const totalAmount = filtered.reduce((sum, v) => sum + (Number(v.dutyAmount) || 0), 0);

            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(`Total Duties: ${filtered.length}`, 15, 76);
            doc.text(`Total Payable: Rs. ${totalAmount.toLocaleString('en-IN')}`, 15, 84);
            doc.text(`Vendor: ${ownerFilter}`, 15, 92);

            // 3. TABLE
            const body = filtered.map(v => [
                formatDateIST(v.carNumber?.split('#')[1] || v.createdAt),
                v.ownerName,
                `${v.model} - ${v.carNumber?.split('#')[0]}`,
                v.property || 'Direct',
                v.dutyType || 'Standard',
                `Rs. ${Number(v.dutyAmount || 0).toLocaleString('en-IN')}`
            ]);

            autoTable(doc, {
                head: [['DATE', 'VENDOR', 'VEHICLE', 'PROPERTY', 'DUTY TYPE', 'AMOUNT']],
                body: body,
                startY: 100,
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42], fontSize: 8, halign: 'center' },
                bodyStyles: { fontSize: 8, halign: 'center' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 15, right: 15 }
            });

            // 4. SIGNATURE
            let footerY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 100) + 35;
            if (footerY > pageHeight - 60) { doc.addPage(); footerY = 30; }

            const sigX = pageWidth - 75;
            if (signature) {
                doc.addImage(signature, 'PNG', sigX, footerY - 20, 55, 22);
            }
            doc.setDrawColor(15, 23, 42); doc.setLineWidth(0.6);
            doc.line(sigX - 5, footerY + 5, pageWidth - 15, footerY + 5);
            doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); doc.text((selectedCompany?.ownerName || 'AUTHORISED SIGNATORY').toUpperCase(), sigX - 2, footerY + 12);
            doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
            doc.text('Operations Controller', sigX - 2, footerY + 17);
            doc.text(selectedCompany?.name || 'LogKaro', sigX - 2, footerY + 21);

            doc.save(`Outside_Fleet_Report_${fromDate}_to_${toDate}.pdf`);
        } catch (error) {
            console.error(error);
            alert("Error exporting PDF: " + error.message);
        }
    };

    const handleOwnerChange = (val) => {
        setOwnerFilter(val);
        setPropertyFilter('All'); // Reset property when owner changes
    };

    const handleOpenLogDuty = () => {
        setEditMode(false);
        setSelectedId(null);

        // Intelligence: Default the form date to the viewed month
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        
        let defaultDate = todayIST();
        if (selectedMonth === 'All') {
            defaultDate = todayIST();
        } else if (selectedMonth !== currentMonth || selectedYear !== currentYear) {
            const calendarYear = (selectedMonth >= 1 && selectedMonth <= 3) ? selectedYear + 1 : selectedYear;
            const dayToUse = selectedDay === 'All' ? 1 : parseInt(selectedDay);
            defaultDate = toISTDateString(new Date(calendarYear, selectedMonth - 1, dayToUse));
        } else if (selectedDay !== 'All' && parseInt(selectedDay) !== now.getDate()) {
            const calendarYear = (selectedMonth >= 1 && selectedMonth <= 3) ? selectedYear + 1 : selectedYear;
            defaultDate = toISTDateString(new Date(calendarYear, selectedMonth - 1, parseInt(selectedDay)));
        }

        setFormData({
            carNumber: '',
            model: '',
            property: propertyFilter !== 'All' ? propertyFilter : '',
            dutyType: '',
            ownerName: ownerFilter !== 'All' ? ownerFilter : '',
            dutyAmount: '',
            dropLocation: '',
            transactionType: 'Buy',
            date: defaultDate,
            isDuplicateToday: false
        });
        setShowModal(true);
    };

    const handleCarNumberChange = (val) => {
        const upVal = val.toUpperCase();
        setFormData(prev => ({ ...prev, carNumber: upVal }));
        
        if (upVal.length > 1) {
            const matches = vehicles.filter(v => {
                const plate = v.carNumber?.split('#')[0] || '';
                return plate.toUpperCase().includes(upVal);
            });
            
            // Remove duplicates (by plate number)
            const uniqueMatches = [];
            const seen = new Set();
            matches.forEach(m => {
                const plate = m.carNumber?.split('#')[0];
                if (!seen.has(plate)) {
                    seen.add(plate);
                    uniqueMatches.push(m);
                }
            });

            setSuggestions(uniqueMatches.slice(0, 8)); // Limit to 8 suggestions
            setShowSuggestions(true);

            // Exact match auto-fill
            const exactMatch = uniqueMatches.find(m => (m.carNumber?.split('#')[0] || '').toUpperCase() === upVal);
            if (exactMatch) {
                setFormData(prev => ({
                    ...prev,
                    model: exactMatch.model || prev.model,
                    ownerName: exactMatch.ownerName || prev.ownerName
                }));
            }
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const selectSuggestion = (v) => {
        const plate = v.carNumber?.split('#')[0];
        setFormData(prev => ({
            ...prev,
            carNumber: plate,
            model: v.model || prev.model,
            ownerName: v.ownerName || prev.ownerName
        }));
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this outside car?')) return;
        try {
            await axios.delete(`/api/admin/vehicles/${id}`, {
                headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('userInfo')).token}` }
            });
            fetchOutsideVehicles();
        } catch (err) { alert('Error deleting'); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            if (!selectedCompany?._id) return alert("Select a company first!");

            let internalCarNumber = `${formData.carNumber}#${formData.date}`;

            // Add a unique suffix for new entries or when carNumber/date changes in edit mode to avoid collisions
            if (!editMode) {
                internalCarNumber += `#${Math.random().toString(36).substring(2, 7)}`;
            } else if (selectedId) {
                const originalVehicle = vehicles.find(v => v._id === selectedId);
                const oldParts = originalVehicle?.carNumber?.split('#') || [];
                // If the plate and date are the same as before, keep the old unique suffix
                if (formData.carNumber === oldParts[0] && formData.date === oldParts[1] && oldParts[2]) {
                    internalCarNumber += `#${oldParts[2]}`;
                } else {
                    // Plate or date changed, generate new suffix to be safe
                    internalCarNumber += `#${Math.random().toString(36).substring(2, 7)}`;
                }
            }

            let payload = {
                carNumber: internalCarNumber,
                model: formData.model?.trim(),
                property: formData.property?.trim(),
                dutyType: formData.dutyType?.trim() || '',
                ownerName: formData.ownerName?.trim(),
                dutyAmount: Number(formData.dutyAmount) || 0,
                dropLocation: formData.dropLocation?.trim() || '',
                companyId: selectedCompany._id,
                isOutsideCar: true,
                status: 'active',
                transactionType: formData.transactionType || 'Buy',
                createdAt: formData.date
            };

            if (editMode && selectedId) {
                await axios.put(`/api/admin/vehicles/${selectedId}`, payload, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
            } else {
                // Always create a new entry for outside cars now (no merging)
                const data = new FormData();
                Object.keys(payload).forEach(key => data.append(key, payload[key]));
                data.append('permitType', 'Contract');
                data.append('carType', 'Other');
                await axios.post('/api/admin/vehicles', data, {
                    headers: {
                        Authorization: `Bearer ${userInfo.token}`
                    }
                });
            }

            setShowModal(false);
            setEditMode(false);
            setSelectedId(null);
            setFormData({ ...formData, carNumber: '', dutyAmount: '', dropLocation: '', dutyType: '' });
            fetchOutsideVehicles();
        } catch (err) {
            alert(err.response?.data?.message || 'Error processing duty');
        }
    };

    const handleEdit = (vehicle) => {
        setFormData({
            carNumber: vehicle.carNumber?.split('#')[0] || '',
            model: vehicle.model,
            property: vehicle.property || '',
            dutyType: vehicle.dutyType,
            ownerName: vehicle.ownerName,
            dutyAmount: vehicle.dutyAmount,
            dropLocation: vehicle.dropLocation,
            transactionType: vehicle.transactionType || 'Buy',
            date: vehicle.carNumber?.split('#')[1] || toISTDateString(vehicle.createdAt)
        });
        setSelectedId(vehicle._id);
        setEditMode(true);
        setShowModal(true);
    };

    const filtered = vehicles.filter(v => {
        const cleanCarNumber = v.carNumber?.split('#')[0] || '';
        const matchesSearch = cleanCarNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.property?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesOwner = ownerFilter === 'All' || v.ownerName?.trim() === ownerFilter?.trim();
        const currentProperty = v.property?.trim().toLowerCase().replace(/\s+/g, ' ');
        const filterProperty = propertyFilter === 'All' ? 'All' : propertyFilter.trim().toLowerCase().replace(/\s+/g, ' ');
        const matchesProperty = propertyFilter === 'All' || currentProperty === filterProperty;

        // Date Range Logic
        const dutyTagDateStr = v.carNumber?.split('#')[1];
        if (!dutyTagDateStr) return false;

        const matchesDate = dutyTagDateStr >= fromDate && dutyTagDateStr <= toDate;
        const matchesTransaction = (v.transactionType || 'Buy') === transactionFilter;

        return matchesSearch && matchesOwner && matchesProperty && matchesDate && matchesTransaction;
    }).sort((a, b) => {
        const dateA = a.carNumber?.split('#')[1] || '';
        const dateB = b.carNumber?.split('#')[1] || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const totalPayable = filtered.reduce((sum, v) => sum + (v ? (Number(v.dutyAmount) || 0) : 0), 0);
    const totalDutiesCount = filtered.reduce((sum, v) => sum + (v?.dutyType ? v.dutyType.split(' + ').filter(Boolean).length : 0), 0);

    // ── DYNAMIC FILTERS ──
    const ownerBalances = vehicles.reduce((acc, v) => {
        const owner = v.ownerName?.trim();
        const dutyDate = v.carNumber?.split('#')[1];
        if (owner && dutyDate >= fromDate && dutyDate <= toDate && (v.transactionType || 'Buy') === transactionFilter) {
            acc[owner] = (acc[owner] || 0) + (Number(v.dutyAmount) || 0);
        }
        return acc;
    }, {});

    const uniqueOwners = Object.keys(ownerBalances).sort();

    const uniqueProperties = Object.values(vehicles
        .filter(v => {
            const ownerMatch = ownerFilter === 'All' || v.ownerName?.trim() === ownerFilter?.trim();
            const dutyDate = v.carNumber?.split('#')[1];
            const dateMatch = dutyDate >= fromDate && dutyDate <= toDate;
            const transMatch = (v.transactionType || 'Buy') === transactionFilter;
            return ownerMatch && dateMatch && transMatch;
        })
        .reduce((acc, v) => {
            const prop = v.property?.trim();
            if (prop) {
                const key = prop.toLowerCase().replace(/\s+/g, ' ');
                if (!acc[key]) acc[key] = prop;
            }
            return acc;
        }, {})).sort();

    const carNumberSuggestions = [...new Set(vehicles.map(v => v.carNumber?.split('#')[0]).filter(Boolean))];

    const getDynamicSuggestions = () => {
        if (!formData.date) return { types: [], locations: [] };

        const fDate = new Date(formData.date);
        const day = fDate.getDate();
        const formDateObj = new Date(formData.date);
        const targetYearMonth = `${formDateObj.getFullYear()}-${String(formDateObj.getMonth() + 1).padStart(2, '0')}`;

        if (day === 1) return { types: [], locations: [], properties: [] };

        const sameMonthData = vehicles.filter(v => {
            const parts = v.carNumber?.split('#');
            if (!parts || !parts[1]) return false;
            // Date is stored as YYYY-MM-DD
            const vYearMonth = parts[1].substring(0, 7);
            return vYearMonth === targetYearMonth;
        });

        return {
            types: [...new Set(sameMonthData.map(v => v.dutyType).filter(Boolean))],
            locations: [...new Set(sameMonthData.map(v => v.dropLocation).filter(Boolean))],
            properties: [...new Set(sameMonthData.map(v => v.property).filter(Boolean))]
        };
    };

    const dynamicSuggestions = getDynamicSuggestions();
    const dutyTypeSuggestions = dynamicSuggestions.types;
    const dropLocationSuggestions = dynamicSuggestions.locations;
    const propertySuggestions = dynamicSuggestions.properties || [];

    const formatDateDisplay = (dateStr) => {
        return formatDateIST(dateStr);
    };

    return (
        <div key={location.key} className="container-fluid" style={{ paddingBottom: '60px' }}>
            <SEO title="Outside Fleet Command" description="Manage external vehicles and freelancer drivers for specific duties." />

            <style>{`
                .bg-buy { 
                    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(20, 83, 45, 0.2) 100%) !important; 
                    color: #4ade80 !important; 
                    border: 1px solid rgba(34, 197, 94, 0.25) !important;
                    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);
                }
                .bg-sell { 
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(127, 29, 29, 0.2) 100%) !important; 
                    color: #f87171 !important; 
                    border: 1px solid rgba(239, 68, 68, 0.25) !important;
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
                }
                .badge-ext { 
                    padding: 3px 10px; 
                    border-radius: 8px; 
                    font-size: 9px; 
                    font-weight: 950; 
                    letter-spacing: 1px;
                    text-transform: uppercase;
                }
                .stat-circle-svg {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    transform: rotate(-90deg);
                }
                .stat-circle-bg {
                    fill: none;
                    stroke: rgba(255, 255, 255, 0.03);
                    stroke-width: 4;
                }
                .stat-circle-progress {
                    fill: none;
                    stroke-width: 4;
                    stroke-linecap: round;
                    transition: stroke-dashoffset 1s ease-out;
                }
                .payout-glow { filter: drop-shadow(0 0 4px ${theme.primary}); }
                .logs-glow { filter: drop-shadow(0 0 4px #10b981); }
                .table-row-hover:hover { background: rgba(255, 255, 255, 0.02); }
                .action-btn-hover:hover { background: rgba(255, 255, 255, 0.08) !important; color: ${theme.primary} !important; }
                .action-btn-hover-del:hover { background: rgba(244, 63, 94, 0.15) !important; }
            `}</style>

            {/* ═══ PREMIUM DYNAMIC HEADER ═══ */}
            <header style={{ padding: 'clamp(20px, 4vw, 40px) 0', position: 'relative' }}>
                <div className="flex-resp" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '24px', marginBottom: 'clamp(20px, 4vw, 32px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 3vw, 20px)' }}>
                        <div style={{
                            width: 'clamp(48px, 10vw, 64px)', height: 'clamp(48px, 10vw, 64px)',
                            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                            borderRadius: 'clamp(12px, 3vw, 20px)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.05)', position: 'relative', flexShrink: 0
                        }}>
                            <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: `radial-gradient(circle at 30% 30%, ${theme.primary}33, transparent 70%)` }}></div>
                            <Car size={28} color={theme.primary} style={{ filter: `drop-shadow(0 0 10px ${theme.primary}66)` }} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.primary, boxShadow: `0 0 10px ${theme.primary}` }}></motion.div>
                                <span style={{ fontSize: '9px', fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Vendor Command</span>
                            </div>
                            <h1 style={{ color: 'white', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: '950', margin: 0, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
                                Outside <span className="theme-gradient-text">Fleet</span>
                            </h1>
                        </div>
                    </div>

                    <div className="flex-resp" style={{ gap: '16px', alignItems: 'center', flex: 1, justifyContent: 'flex-end', width: '100%' }}>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap' }}>
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{
                                width: 'clamp(70px, 12vw, 100px)', height: 'clamp(70px, 12vw, 100px)', borderRadius: '50%',
                                background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(251, 191, 36, 0.1)',
                                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative'
                            }}>
                                <svg className="stat-circle-svg" viewBox="0 0 100 100">
                                    <circle className="stat-circle-bg" cx="50" cy="50" r="45" />
                                    <motion.circle className="stat-circle-progress payout-glow" cx="50" cy="50" r="45" stroke={theme.primary} initial={{ strokeDasharray: "283 283", strokeDashoffset: 283 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 1.5, ease: "easeOut" }} />
                                </svg>
                                <span style={{ fontSize: '7px', fontWeight: '950', color: theme.primary, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px', position: 'relative', zIndex: 1 }}>Payout</span>
                                <span style={{ color: 'white', fontSize: 'clamp(10px, 2.5vw, 14px)', fontWeight: '950', position: 'relative', zIndex: 1 }}>₹{totalPayable.toLocaleString()}</span>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} style={{
                                width: 'clamp(70px, 12vw, 100px)', height: 'clamp(70px, 12vw, 100px)', borderRadius: '50%',
                                background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(16, 185, 129, 0.1)',
                                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative'
                            }}>
                                <svg className="stat-circle-svg" viewBox="0 0 100 100">
                                    <circle className="stat-circle-bg" cx="50" cy="50" r="45" />
                                    <motion.circle className="stat-circle-progress logs-glow" cx="50" cy="50" r="45" stroke="#10b981" initial={{ strokeDasharray: "283 283", strokeDashoffset: 283 }} animate={{ strokeDashoffset: -200 }} transition={{ duration: 1.8, ease: "easeOut" }} />
                                </svg>
                                <span style={{ fontSize: '7px', fontWeight: '950', color: '#10b981', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px', position: 'relative', zIndex: 1 }}>Vehicles</span>
                                <span style={{ color: 'white', fontSize: 'clamp(12px, 3vw, 16px)', fontWeight: '950', position: 'relative', zIndex: 1 }}>{totalDutiesCount}</span>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ═══ CLEAN PREMIUM INTEGRATED CONTROL BAR ═══ */}
            <div className="glass-card" style={{ padding: 'clamp(12px, 2vw, 16px)', marginBottom: 'clamp(24px, 4vw, 32px)', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '24px' }}>
                <div className="flex-resp" style={{ gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ position: 'relative', flex: '2', minWidth: '200px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: theme.primary, opacity: 0.4, zIndex: 1 }} />
                        <input type="text" placeholder="Search vehicle, owner, or property..." className="premium-compact-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: '48px', height: '52px', width: '100%' }} />
                    </div>
                    <div className="flex-resp" style={{ gap: '8px', flex: '3', minWidth: '300px' }}>
                        <select value={ownerFilter} onChange={e => handleOwnerChange(e.target.value)} className="premium-compact-input" style={{ height: '52px', flex: 1 }}>
                            <option value="All">All Vendors</option>
                            {uniqueOwners.map(o => (
                                <option key={o} value={o}>
                                    {o} (₹{(ownerBalances[o] || 0).toLocaleString()})
                                </option>
                            ))}
                        </select>
                        <select value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)} className="premium-compact-input" style={{ height: '52px', flex: 1 }}>
                            <option value="All">All Properties</option>
                            {uniqueProperties.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-resp" style={{ gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '14px', gap: '4px' }}>
                            {['Buy', 'Sell'].map(t => (
                                <button key={t} onClick={() => setTransactionFilter(t)} style={{
                                    padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '11px', fontWeight: '900', cursor: 'pointer',
                                    background: transactionFilter === t ? (t === 'Buy' ? '#22c55e20' : '#ef444420') : 'transparent',
                                    color: transactionFilter === t ? (t === 'Buy' ? '#22c55e' : '#ef4444') : 'rgba(255,255,255,0.3)',
                                    transition: '0.3s'
                                }}>{t}</button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <select value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value === 'All' ? 'All' : Number(e.target.value)); setSelectedDay('All'); }} className="premium-compact-input" style={{ height: '40px', width: '95px', fontSize: '11px', padding: '0 10px' }}>
                                <option value="All">Full Year</option>
                                {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map(m => (
                                    <option key={m} value={m}>
                                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]}
                                    </option>
                                ))}
                            </select>
                            <select value={selectedYear} onChange={e => { setSelectedYear(Number(e.target.value)); setSelectedDay('All'); }} className="premium-compact-input" style={{ height: '40px', width: '85px', fontSize: '11px', padding: '0 10px' }}>
                                {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}-{y + 1}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={handleOpenLogDuty} style={{ height: '40px', padding: '0 20px', background: theme.primary, color: 'black', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={16} strokeWidth={3} /> <span className="hide-mobile">Add Duty</span>
                        </button>
                        <button onClick={handleExportPDF} style={{ height: '40px', width: '40px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <FileText size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══ TABLE VIEW (Desktop) ═══ */}
            <div className="hide-mobile table-responsive-wrapper" style={{ background: 'rgba(15, 23, 42, 0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Date</th>
                            <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Vehicle / Vendor</th>
                            <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Property / Duty</th>
                            <th style={{ padding: '20px 24px', textAlign: 'right', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Amount</th>
                            <th style={{ padding: '20px 24px', textAlign: 'right', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: '80px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '12px', fontWeight: '800' }}>LOADING DATA...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '80px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '12px', fontWeight: '800' }}>NO RECORDS FOUND</td></tr>
                        ) : filtered.map((v, idx) => (
                            <motion.tr key={v._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{formatDateIST(v.carNumber?.split('#')[1] || v.createdAt)}</div>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>{new Date(v.carNumber?.split('#')[1] || v.createdAt).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Car size={18} color="#38bdf8" />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '900', color: 'white' }}>{v.carNumber?.split('#')[0]} <span className={`badge-ext ${v.transactionType === 'Buy' ? 'bg-buy' : 'bg-sell'}`} style={{ fontSize: '7px' }}>{v.transactionType}</span></div>
                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>{v.ownerName} ({v.model})</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{v.property || 'Direct'}</div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>{v.dutyType} {v.dropLocation && <>➜ {v.dropLocation}</>}</div>
                                </td>
                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                    <div style={{ fontSize: '16px', fontWeight: '1000', color: '#10b981' }}>₹{v.dutyAmount?.toLocaleString()}</div>
                                </td>
                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button onClick={() => handleEdit(v)} className="action-btn-hover" style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit size={14} /></button>
                                        <button onClick={() => handleDelete(v._id)} className="action-btn-hover-del" style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.1)', color: '#f43f5e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ═══ CARD VIEW (Mobile) ═══ */}
            <div className="show-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filtered.map((v, idx) => (
                    <motion.div key={v._id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Car size={18} color="#38bdf8" /></div>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: '950', color: 'white' }}>{v.carNumber?.split('#')[0]}</div>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>{v.ownerName}</div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '16px', fontWeight: '1000', color: '#10b981' }}>₹{v.dutyAmount?.toLocaleString()}</div>
                                <span className={`badge-ext ${v.transactionType === 'Buy' ? 'bg-buy' : 'bg-sell'}`} style={{ fontSize: '6px', padding: '2px 6px' }}>{v.transactionType}</span>
                            </div>
                        </div>
                        <div style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '800' }}>PROPERTY</span>
                                <span style={{ fontSize: '11px', color: 'white', fontWeight: '900' }}>{v.property || 'Direct'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '800' }}>DATE</span>
                                <span style={{ fontSize: '11px', color: theme.primary, fontWeight: '900' }}>{formatDateIST(v.carNumber?.split('#')[1] || v.createdAt)}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>{v.dutyType}</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => handleEdit(v)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white' }}><Edit size={14} /></button>
                                <button onClick={() => handleDelete(v._id)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.1)', border: 'none', color: '#f43f5e' }}><Trash2 size={14} /></button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ═══ MODAL ═══ */}
            <AnimatePresence>
                {showModal && (
                    <div className="modal-overlay">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="modal-content-wrapper" style={{ maxWidth: '700px', width: '95%', padding: 0 }}>
                            <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '950', margin: 0 }}>{editMode ? 'Edit Entry' : 'Add Duty Entry'}</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: '700', marginTop: '4px' }}>Fill details for the outside fleet duty.</p>
                                </div>
                                <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}><X size={24} /></button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
                                <div className="form-grid-2" style={{ gap: '20px', marginBottom: '20px' }}>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Assignment Date *</label>
                                        <input type="date" className="premium-compact-input" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} style={{ height: '52px', colorScheme: 'dark' }} />
                                    </div>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Client Property *</label>
                                        <input type="text" className="premium-compact-input" list="propList" required value={formData.property} onChange={e => setFormData({ ...formData, property: e.target.value })} placeholder="Property Name" style={{ height: '52px' }} />
                                        <datalist id="propList">{propertySuggestions.map(p => <option key={p} value={p} />)}</datalist>
                                    </div>
                                </div>

                                <div className="form-grid-2" style={{ gap: '20px', marginBottom: '20px' }}>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Vehicle Plate *</label>
                                        <input type="text" className="premium-compact-input" required value={formData.carNumber} onChange={e => handleCarNumberChange(e.target.value)} placeholder="RJ-XX-XX-XXXX" style={{ height: '52px', textTransform: 'uppercase' }} />
                                        <AnimatePresence>
                                            {showSuggestions && suggestions.length > 0 && (
                                                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="suggestions-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e293b', borderRadius: '12px', zIndex: 100, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                                    {suggestions.map((s, i) => <div key={i} onClick={() => selectSuggestion(s)} style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'white', fontSize: '13px' }}>{s.carNumber?.split('#')[0]} ({s.ownerName})</div>)}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Model *</label>
                                        <input type="text" className="premium-compact-input" required value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} placeholder="e.g. Innova" style={{ height: '52px' }} />
                                    </div>
                                </div>

                                <div className="form-grid-2" style={{ gap: '20px', marginBottom: '20px' }}>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Vendor / Owner *</label>
                                        <input type="text" className="premium-compact-input" required value={formData.ownerName} onChange={e => setFormData({ ...formData, ownerName: e.target.value })} placeholder="Vendor Name" style={{ height: '52px' }} />
                                    </div>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Transaction Type</label>
                                        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '12px', gap: '4px', height: '52px' }}>
                                            {['Buy', 'Sell'].map(t => (
                                                <button key={t} type="button" onClick={() => setFormData({ ...formData, transactionType: t })} style={{
                                                    flex: 1, borderRadius: '8px', border: 'none', cursor: 'pointer', transition: '0.3s',
                                                    background: formData.transactionType === t ? (t === 'Buy' ? '#22c55e' : '#ef4444') : 'transparent',
                                                    color: formData.transactionType === t ? 'black' : 'rgba(255,255,255,0.3)',
                                                    fontWeight: '900', fontSize: '12px'
                                                }}>{t}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-grid-2" style={{ gap: '20px', marginBottom: '32px' }}>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Service Type</label>
                                        <input type="text" className="premium-compact-input" list="typeList" value={formData.dutyType} onChange={e => setFormData({ ...formData, dutyType: e.target.value })} placeholder="e.g. Local Duty" style={{ height: '52px' }} />
                                        <datalist id="typeList">{dutyTypeSuggestions.map(t => <option key={t} value={t} />)}</datalist>
                                    </div>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Payout Amount (₹) *</label>
                                        <input type="number" className="premium-compact-input" required value={formData.dutyAmount} onChange={e => setFormData({ ...formData, dutyAmount: e.target.value })} placeholder="0.00" style={{ height: '52px', fontSize: '18px', fontWeight: '950', color: '#10b981' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '800', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" style={{ flex: 2, height: '56px', borderRadius: '16px', background: theme.primary, border: 'none', color: 'black', fontWeight: '1000', fontSize: '16px', cursor: 'pointer', boxShadow: `0 10px 20px ${theme.primary}30` }}>{editMode ? 'Update' : 'Submit'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OutsideCars;
